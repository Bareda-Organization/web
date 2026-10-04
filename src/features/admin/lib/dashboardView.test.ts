import { describe, expect, it } from "vitest";
import type { DashboardRecentEventResponseTypes, DashboardTodayRunResponseTypes } from "../types/dashboard";
import {
  academyStatusCounts,
  dashboardQuery,
  eventSentence,
  eventTime,
  loginGrowthText,
  onTimeText,
  runProgress,
  runsDeltaText,
} from "./dashboardView";

const run = (patch: Partial<DashboardTodayRunResponseTypes>): DashboardTodayRunResponseTypes => ({
  runId: "1",
  academyId: "10",
  academyName: "하늘수학",
  busNo: "2호차",
  direction: "to_academy",
  departTime: "2026-10-03T12:20:00+09:00",
  estArrivalTime: "2026-10-03T13:00:00+09:00",
  runStatus: "moving",
  startedAt: "2026-10-03T12:20:00+09:00",
  finishedAt: null,
  delayMinutes: null,
  stopsDone: 3,
  stopsTotal: 10,
  pendingChangeCount: 0,
  driverAssigned: true,
  ...patch,
});

const at = (clock: string) => new Date(`2026-10-03T${clock}:00+09:00`).getTime();

describe("runProgress — (지금 − 출발) / (도착 예정 − 출발)", () => {
  it("이동 중이면 출발~도착 예정 사이 비율을 퍼센트로 낸다", () => {
    expect(runProgress(run({}), at("12:40"))).toEqual({ kind: "percent", value: 50 });
  });

  it("범위를 넘으면 0~100 으로 자른다", () => {
    expect(runProgress(run({}), at("12:00"))).toEqual({ kind: "percent", value: 0 });
    expect(runProgress(run({}), at("14:00"))).toEqual({ kind: "percent", value: 100 });
  });

  it("종료한 회차는 100% 다", () => {
    expect(runProgress(run({ runStatus: "finished", finishedAt: "2026-10-03T12:58:00+09:00" }), at("14:00"))).toEqual({ kind: "percent", value: 100 });
  });

  it("출발 전(운행 전 · 확정) 회차는 퍼센트가 없다", () => {
    expect(runProgress(run({ runStatus: "confirmed", startedAt: null }), at("12:00"))).toEqual({ kind: "before" });
    expect(runProgress(run({ runStatus: "idle", startedAt: null }), at("12:00"))).toEqual({ kind: "before" });
  });

  // Ruling 827 — 도착 예정을 계산할 수 없는 이동 중 회차는 비율을 만들지 않고 모름 상태로 둔다(0% 로 꾸미지 않는다).
  it("이동 중인데 도착 예정이 null 이면 퍼센트를 지어내지 않는다", () => {
    expect(runProgress(run({ estArrivalTime: null }), at("12:40"))).toEqual({ kind: "unknown" });
  });
});

describe("지표 문구", () => {
  it("정시 출발률이 null 이면 —, 아니면 반올림한 퍼센트", () => {
    expect(onTimeText(null)).toBe("—");
    expect(onTimeText(0.91)).toBe("91");
    expect(onTimeText(0.905)).toBe("91");
  });

  it("직전 기간 대비는 부호를 붙이고 기간 이름이 기간 길이를 따른다", () => {
    expect(runsDeltaText(7, 55, 53)).toBe("지난주 대비 +2회");
    expect(runsDeltaText(1, 8, 10)).toBe("어제 대비 -2회");
    expect(runsDeltaText(30, 100, 100)).toBe("직전 30일 대비 0회");
  });

  it("어제 로그인 성공이 0 이면 배수를 만들지 않는다", () => {
    expect(loginGrowthText(82, 39)).toBe("어제의 2.1배");
    expect(loginGrowthText(5, 0)).toBeNull();
  });
});

describe("academyStatusCounts — 학원별 · 상태별 회차 수", () => {
  it("학원마다 상태별 수를 세고 전체 합계를 따로 낸다", () => {
    const rows = academyStatusCounts([
      run({ runStatus: "finished" }),
      run({ runStatus: "moving" }),
      run({ academyId: "11", academyName: "새봄영어", runStatus: "confirmed" }),
    ]);
    expect(rows.byAcademy.map((row) => [row.academyName, row.total, row.counts.finished, row.counts.moving, row.counts.confirmed])).toEqual([
      ["하늘수학", 2, 1, 1, 0],
      ["새봄영어", 1, 0, 0, 1],
    ]);
    expect(rows.all).toMatchObject({ total: 3, counts: { finished: 1, moving: 1, confirmed: 1, idle: 0 } });
  });
});

describe("최근 기록 한 줄", () => {
  const base: DashboardRecentEventResponseTypes = {
    at: "2026-10-03T12:41:00+09:00",
    kind: "run_confirmed",
    academyName: "하늘수학",
    runId: "9",
    busNo: "3호차",
    direction: "to_academy",
    delayMinutes: null,
    pendingChangeCount: 3,
    name: null,
    status: null,
  };

  it("확정은 대기 중 변경 요청이 있을 때만 붙인다", () => {
    expect(eventSentence(base)).toBe("하늘수학 3호차 등원 확정 · 변경 요청 3건 승인 대기");
    expect(eventSentence({ ...base, pendingChangeCount: 0 })).toBe("하늘수학 3호차 등원 확정");
  });

  it("출발 · 종료 · 지연 알림 · 가입 신청", () => {
    expect(eventSentence({ ...base, kind: "run_started", busNo: "2호차" })).toBe("하늘수학 2호차 등원 출발");
    expect(eventSentence({ ...base, kind: "run_finished", direction: "from_academy" })).toBe("하늘수학 3호차 하원 종료");
    expect(eventSentence({ ...base, kind: "delay_notified", delayMinutes: 10 })).toBe("하늘수학 3호차 등원 10분 지연 알림 발송");
    expect(eventSentence({ ...base, kind: "staff_signup_requested", name: "민창민", academyName: "새봄영어", status: "pending", runId: null, busNo: null, direction: null })).toBe(
      "민창민 가입 신청 · 새봄영어 (대기 중)",
    );
  });

  it("오늘 사건은 시:분, 이전 날짜는 월/일", () => {
    const now = new Date("2026-10-03T12:45:00+09:00");
    expect(eventTime("2026-10-03T12:41:00+09:00", now)).toBe("12:41");
    expect(eventTime("2026-10-01T09:00:00+09:00", now)).toBe("10/1");
  });
});

describe("dashboardQuery — 기간·학원 선택이 요청 인자로 바뀐다", () => {
  it("전체 학원이면 academyId 를 비운다", () => {
    expect(dashboardQuery(7, "all")).toEqual({ days: 7, academyId: undefined });
    expect(dashboardQuery(30, "11")).toEqual({ days: 30, academyId: "11" });
  });
});
