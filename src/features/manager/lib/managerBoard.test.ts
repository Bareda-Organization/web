import { describe, expect, it } from "vitest";
import type { ManagerItemResponseTypes } from "../types";
import { formatWorkHours, openDriverCandidates, summarizeManagers } from "./managerBoard";

const TODAY = "2026-10-03"; // 토요일
const m = (id: string, name: string, over: Partial<ManagerItemResponseTypes> = {}): ManagerItemResponseTypes => ({
  id,
  name,
  phone: `010-0000-${id.padStart(4, "0")}`,
  role: "driver",
  workHours: null,
  accountId: "1",
  assignedRunCount: 0,
  assignments: [],
  ...over,
});
const sat = (start: string, end: string) => ({ sat: [{ start, end }] });
const todayRun = { runId: "1", serviceDate: TODAY, busNo: "1호차", direction: "to_academy" as const, departTime: "2026-10-03T11:08:00+09:00", status: "idle" as const };

describe("formatWorkHours — 근무 시간 한 줄", () => {
  const range = (start: string, end: string) => [{ start, end }];
  it("이어진 요일은 월-토, 떨어진 요일은 점으로 잇는다", () => {
    const week = { mon: range("11:00", "22:30"), tue: range("11:00", "22:30"), wed: range("11:00", "22:30"), thu: range("11:00", "22:30"), fri: range("11:00", "22:30"), sat: range("11:00", "22:30") };
    expect(formatWorkHours(week)).toBe("월-토 11:00–22:30");
    expect(formatWorkHours({ tue: range("10:00", "18:00"), thu: range("10:00", "18:00"), sat: range("10:00", "18:00") })).toBe("화 · 목 · 토 10:00–18:00");
  });
  it("시각이 다른 요일은 갈라서 적고, 근무 시간이 없으면 미입력", () => {
    expect(formatWorkHours({ mon: range("09:00", "18:00"), sat: range("10:00", "14:00") })).toBe("월 09:00–18:00 / 토 10:00–14:00");
    expect(formatWorkHours(null)).toBe("미입력");
  });
});

describe("summarizeManagers — 지표", () => {
  const all = [
    m("1", "최동훈", { assignedRunCount: 4, assignments: [todayRun] }),
    m("2", "문태호", { workHours: sat("12:00", "22:00") }),
    m("3", "강수정", { role: "escort", accountId: null, assignments: [todayRun] }),
  ];
  it("역할별 · 앱 계정 연결 · 오늘 배치 없는 사람", () => {
    const summary = summarizeManagers(all, TODAY);
    expect(summary).toMatchObject({ total: 3, drivers: 2, escorts: 1, linked: 2, unlinked: 1 });
    expect(summary.assignedToday).toBe(2);
    expect(summary.unassignedToday.map((x) => x.name)).toEqual(["문태호"]);
  });
});

describe("openDriverCandidates — 기사 미배치 회차에 넣을 수 있는 기사", () => {
  const run = { busNo: "3호차", direction: "from_academy" as const, departTime: "2026-10-03T14:53:00+09:00" };
  it("오늘 배치가 없고 그 시각이 근무 시간 안인 기사만 — 동승자 · 이미 배치된 기사 · 근무 시간 밖은 뺀다", () => {
    const all = [
      m("1", "최동훈", { workHours: sat("10:00", "22:00"), assignments: [todayRun] }),
      m("2", "문태호", { workHours: sat("12:00", "22:00") }),
      m("3", "서진우", { workHours: sat("10:00", "18:00") }),
      m("4", "한밤", { workHours: sat("18:00", "23:00") }),
      m("5", "강수정", { role: "escort", workHours: sat("10:00", "22:00") }),
    ];
    expect(openDriverCandidates(run, all, TODAY).map((x) => x.name)).toEqual(["문태호", "서진우"]);
  });
});
