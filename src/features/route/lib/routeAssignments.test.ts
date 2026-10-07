import { describe, expect, it } from "vitest";
import type { RunItemResponseTypes } from "@/features/schedule";
import { addDays, runsOfRoute, weekdayOfDate } from "./routeAssignments";

const run = (over: Partial<RunItemResponseTypes>): RunItemResponseTypes => ({
  id: "1",
  busId: "3",
  busNo: "1호차",
  scheduleId: null,
  serviceDate: "2026-10-05", // 월요일
  direction: "to_academy",
  departTime: "2026-10-05T18:20:00+09:00",
  confirmAt: "2026-10-05T17:50:00+09:00",
  status: "idle",
  originName: "",
  destinationName: "",
  estDurationMin: null,
  canceledAt: null,
  consecutiveFailures: 0,
  assignments: [],
  ...over,
});

describe("weekdayOfDate · addDays — 날짜 문자열만으로 계산한다", () => {
  it("2026-10-05 는 월요일, 하루 더하면 화요일이고 월 경계를 넘는다", () => {
    expect(weekdayOfDate("2026-10-05")).toBe("mon");
    expect(weekdayOfDate("2026-10-11")).toBe("sun");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});

// R50 S10 — A-08 고정 노선 배치 매니저. 고정 노선에는 배치가 없어서 "그 편성(차량 × 요일 × 방향)과 같은 회차" 의 배치를 보인다.
describe("runsOfRoute — 같은 편성의 회차만 고른다", () => {
  const route = { busId: "3", weekday: "mon" as const, direction: "to_academy" as const };

  it("차량 · 방향 · 요일이 모두 같은 회차만 남기고 날짜순으로 낸다", () => {
    const runs = [
      run({ id: "later", serviceDate: "2026-10-12" }),
      run({ id: "other-bus", busId: "4" }),
      run({ id: "other-direction", direction: "from_academy" }),
      run({ id: "other-weekday", serviceDate: "2026-10-06" }),
      run({ id: "same" }),
    ];

    expect(runsOfRoute(runs, route).map((item) => item.id)).toEqual(["same", "later"]);
  });

  it("취소된 회차는 뺀다", () => {
    expect(runsOfRoute([run({ canceledAt: "2026-10-05T09:00:00+09:00" })], route)).toEqual([]);
  });
});
