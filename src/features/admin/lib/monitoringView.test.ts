import { describe, expect, it } from "vitest";
import type { RunLiveItemResponseTypes } from "../types";
import { barGeometry, needsAttention, nowPercent, runStatusNote, summarizeToday, timetableAxis, DEFAULT_BAR_MINUTES } from "./monitoringView";

const at = (clock: string) => `2026-10-03T${clock}:00+09:00`;
const ms = (clock: string) => new Date(at(clock)).getTime();

const run = (patch: Partial<RunLiveItemResponseTypes>): RunLiveItemResponseTypes => ({
  runId: "1",
  busNo: "1호차",
  direction: "to_academy",
  runStatus: "moving",
  position: null,
  lastSeenAt: null,
  departTime: at("12:20"),
  confirmAt: at("11:50"),
  estDepartTime: at("12:21"),
  stops: [],
  destinationEta: at("12:56"),
  driver: { name: "한상철", phone: "010-0000-2012" },
  escort: { name: "윤미경", phone: "010-0000-2013" },
  consecutiveFailures: 0,
  delayMinutes: null,
  finishedAt: null,
  ...patch,
});

describe("timetableAxis — 하루 회차를 정시로 감싼다(서울 시각)", () => {
  it("가장 이른 출발을 내림 · 가장 늦은 도착을 올림한 정시", () => {
    const axis = timetableAxis([run({ departTime: at("11:08"), destinationEta: at("11:41") }), run({ departTime: at("14:53"), destinationEta: at("15:30") })]);
    expect(axis.startMs).toBe(ms("11:00"));
    expect(axis.endMs).toBe(ms("16:00"));
  });

  it("회차가 없거나 한 점뿐이어도 최소 한 시간 폭을 둔다", () => {
    const axis = timetableAxis([run({ departTime: at("12:20"), destinationEta: at("12:21") })]);
    expect(axis.endMs - axis.startMs).toBeGreaterThanOrEqual(3_600_000);
  });
});

describe("barGeometry — 출발 → 도착 예정 막대", () => {
  const axis = { startMs: ms("11:00"), endMs: ms("15:00") };

  it("출발과 도착 예정 사이를 축 비율(%)로 그린다", () => {
    const bar = barGeometry(run({ departTime: at("12:00"), destinationEta: at("13:00") }), axis);
    expect(bar.left).toBeCloseTo(25, 1);
    expect(bar.width).toBeCloseTo(25, 1);
  });

  // Ruling 827 — 도착 예정을 계산하지 못한 회차는 출발부터 기본 길이로 그린다(없는 도착 시각을 지어내지 않는다).
  it("도착 예정이 null 이면 출발부터 기본 길이만큼 그린다", () => {
    const bar = barGeometry(run({ departTime: at("12:00"), destinationEta: null }), axis);
    expect(bar.width).toBeCloseTo((DEFAULT_BAR_MINUTES / 240) * 100, 1);
    expect(bar.estimated).toBe(true);
  });
});

describe("nowPercent — 지금 세로선", () => {
  it("축 안이면 비율, 밖이면 null", () => {
    const axis = { startMs: ms("11:00"), endMs: ms("15:00") };
    expect(nowPercent(ms("13:00"), axis)).toBeCloseTo(50, 1);
    expect(nowPercent(ms("16:00"), axis)).toBeNull();
  });
});

describe("runStatusNote · needsAttention — 상태 아래 한 줄과 주의 행", () => {
  it("이동 중이면 위치 수신 시각", () => {
    expect(runStatusNote(run({ position: { lat: 1, lng: 1, receivedAt: at("12:45") } }), ms("12:46"))).toBe("위치 수신 12:45");
  });

  it("확정인데 출발 시각이 지났으면 몇 분 경과 · 운행 시작 전, 주의 행이다", () => {
    const late = run({ runStatus: "confirmed", departTime: at("12:41"), driver: null, escort: null, destinationEta: at("13:10") });
    expect(runStatusNote(late, ms("12:45"))).toBe("출발 시각 4분 경과 · 운행 시작 전");
    expect(needsAttention(late, ms("12:45"))).toBe(true);
  });

  it("출발 전이고 기사 · 동승자가 없으면 미배치를 알리고 주의 행이다", () => {
    const unassigned = run({ runStatus: "idle", departTime: at("14:53"), driver: null, escort: null });
    expect(runStatusNote(unassigned, ms("12:45"))).toBe("기사 · 동승자 미배치");
    expect(needsAttention(unassigned, ms("12:45"))).toBe(true);
  });

  it("정상 종료 회차는 주의가 아니다", () => {
    expect(needsAttention(run({ runStatus: "finished", finishedAt: at("11:41") }), ms("12:45"))).toBe(false);
  });

  it("지연 분이 있거나 확정이 연속 실패한 회차는 주의 행이다", () => {
    expect(needsAttention(run({ delayMinutes: 10 }), ms("12:45"))).toBe(true);
    expect(needsAttention(run({ runStatus: "idle", consecutiveFailures: 3, departTime: at("14:00") }), ms("12:45"))).toBe(true);
  });
});

describe("summarizeToday — 지표 5칸", () => {
  const today = [
    { academyId: "1", academyName: "하늘수학", academyStatus: "active" as const, runCount: 6, byStatus: { idle: 2, confirmed: 2, moving: 1, finished: 1 }, delayedRuns: 1, confirmFailedRuns: 0 },
    { academyId: "2", academyName: "새봄영어", academyStatus: "active" as const, runCount: 2, byStatus: { idle: 0, confirmed: 1, moving: 1, finished: 0 }, delayedRuns: 0, confirmFailedRuns: 0 },
    { academyId: "3", academyName: "오정꿈나무", academyStatus: "inactive" as const, runCount: 0, byStatus: { idle: 0, confirmed: 0, moving: 0, finished: 0 }, delayedRuns: 0, confirmFailedRuns: 0 },
  ];

  it("전 학원 합계와 학원별 내역을 낸다", () => {
    const summary = summarizeToday(today, { "1": 1 });
    expect(summary.total).toBe(8);
    expect(summary.moving).toBe(2);
    expect(summary.delayed).toBe(1);
    expect(summary.confirmFailed).toBe(0);
    expect(summary.openEmergencies).toBe(1);
    expect(summary.byStatus).toEqual({ idle: 2, confirmed: 3, moving: 2, finished: 1 });
    expect(summary.perAcademy.total).toBe("하늘수학 6 · 새봄영어 2");
    expect(summary.perAcademy.moving).toBe("하늘수학 1 · 새봄영어 1");
    expect(summary.perAcademy.delayed).toBe("하늘수학 1");
  });
});
