import { describe, expect, it } from "vitest";
import type { BusItemResponseTypes } from "../types";
import { filterBuses, seatSplit, summarizeBuses } from "./busBoard";

const bus = (id: string, busNo: string, over: Partial<BusItemResponseTypes> = {}): BusItemResponseTypes => ({
  id,
  busNo,
  plateNo: `99가${id}`,
  capacity: 25,
  studentCapacity: 23,
  operable: true,
  routeCount: 14,
  scheduleCount: 14,
  todayRuns: [],
  ...over,
});
const run = (runId: string) => ({ runId, direction: "to_academy" as const, departTime: "2026-10-03T11:08:00+09:00", status: "idle" as const });

// R48-WEB-STAFF 차량 관리 — 지표 4칸이 목록 응답(`today_runs[]` · `student_capacity`)에서 어떻게 나오는지.
describe("summarizeBuses — 차량 지표", () => {
  const buses = [
    bus("1", "1호차", { todayRuns: [run("a"), run("b")] }),
    bus("2", "2호차", { todayRuns: [run("c"), run("d")] }),
    bus("3", "3호차", { todayRuns: [run("e"), run("f")] }),
    bus("4", "4호차", { capacity: 12, studentCapacity: 10, operable: false }),
  ];

  it("학생 탑승 가능 합계는 운행 가능 차량만 더한다(운행 불가 4호차의 10명은 뺀다)", () => {
    expect(summarizeBuses(buses).studentSeats).toBe(69);
  });

  it("오늘 운행 회차 수 · 운행하는 차량 수 · 쉬는 차량 이름", () => {
    const summary = summarizeBuses(buses);
    expect(summary.runCount).toBe(6);
    expect(summary.runningBusCount).toBe(3);
    expect(summary.restingBusNos).toEqual(["4호차"]);
    expect(summary.operable).toBe(3);
    expect(summary.inoperable).toBe(1);
  });
});

describe("filterBuses — 상태 필터", () => {
  const buses = [bus("1", "1호차"), bus("4", "4호차", { operable: false })];
  it("운행 불가만 · 운행 가능만 · 전체", () => {
    expect(filterBuses(buses, "inoperable").map((b) => b.busNo)).toEqual(["4호차"]);
    expect(filterBuses(buses, "operable").map((b) => b.busNo)).toEqual(["1호차"]);
    expect(filterBuses(buses, "")).toHaveLength(2);
  });
});

describe("seatSplit — 좌석 구성", () => {
  it("정원 25 · 학생 23 이면 기사 1 · 동승 1", () => {
    expect(seatSplit(bus("1", "1호차"))).toEqual({ student: 23, reserved: 2 });
  });
});
