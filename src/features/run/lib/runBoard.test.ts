import { describe, expect, it } from "vitest";
import type { DashboardRunResponseTypes } from "../types";
import { barGeometry, runAttention, splitRiders, timetableRange } from "./runBoard";

const run = (patch: Partial<DashboardRunResponseTypes> = {}): DashboardRunResponseTypes => ({
  runId: "1",
  busNo: "1호차",
  direction: "to_academy",
  departTime: "2026-10-03T12:20:00+09:00",
  startedAt: null,
  finishedAt: null,
  estArrivalTime: null,
  driverName: "최동훈",
  escortName: "정은영",
  boardedCount: 0,
  totalCount: 20,
  runStatus: "idle",
  addedCount: 0,
  removedCount: 0,
  ackDriver: false,
  ackEscort: false,
  noShowCases: [],
  driverPhone: null,
  escortPhone: null,
  noShowCount: 0,
  absentCount: 0,
  delayMinutes: null,
  lastDelayNotice: null,
  ...patch,
});

describe("splitRiders — 회차 학생 4분류(Ruling 810)", () => {
  it("탑승·미승차·미등원이 아닌 나머지를 대기로 계산한다", () => {
    expect(splitRiders(run({ totalCount: 20, boardedCount: 11, noShowCount: 2, absentCount: 1 }))).toEqual({
      boarded: 11,
      noShow: 2,
      absent: 1,
      waiting: 6,
    });
  });

  it("합이 전체를 넘어도 대기는 음수가 되지 않는다", () => {
    expect(splitRiders(run({ totalCount: 5, boardedCount: 4, noShowCount: 2, absentCount: 1 })).waiting).toBe(0);
  });
});

describe("timetableRange · barGeometry — 시간표 막대", () => {
  const runs = [
    run({ runId: "a", departTime: "2026-10-03T11:08:00+09:00", startedAt: "2026-10-03T11:09:00+09:00", finishedAt: "2026-10-03T11:47:00+09:00", runStatus: "finished" }),
    run({ runId: "b", departTime: "2026-10-03T14:53:00+09:00", estArrivalTime: "2026-10-03T15:30:00+09:00" }),
  ];

  it("가장 이른 출발의 정시부터 가장 늦은 도착의 다음 정시까지를 범위로 잡는다", () => {
    const range = timetableRange(runs);
    expect(new Date(range.startMs).toISOString()).toBe("2026-10-03T02:00:00.000Z"); // 11:00 KST
    expect(new Date(range.endMs).toISOString()).toBe("2026-10-03T07:00:00.000Z"); // 16:00 KST
  });

  it("도착 예정이 null 이면 기본 길이만큼 막대를 그린다(Ruling 827)", () => {
    const range = timetableRange(runs);
    const noEta = run({ departTime: "2026-10-03T13:00:00+09:00" });
    const geometry = barGeometry(noEta, range);
    // 13:00 → 11:00 시작 + 120분 / 300분 = 40%
    expect(geometry.leftPct).toBeCloseTo(40, 5);
    expect(geometry.widthPct).toBeGreaterThan(0);
  });

  it("실제 출발·도착이 있으면 예정이 아니라 실제 구간을 그린다", () => {
    const range = timetableRange(runs);
    const geometry = barGeometry(runs[0], range);
    // 11:09 → 11:47 : (9 / 300) · (38 / 300)
    expect(geometry.leftPct).toBeCloseTo(3, 5);
    expect(geometry.widthPct).toBeCloseTo((38 / 300) * 100, 5);
  });
});

describe("runAttention — 행의 긴급도", () => {
  const now = Date.parse("2026-10-03T12:35:00+09:00");

  it("기사가 없는 아직 안 끝난 회차는 위험(bad)이고 사유는 기사 미배치", () => {
    expect(runAttention(run({ driverName: null }), now)).toMatchObject({ tone: "bad", reason: "기사 미배치" });
  });

  it("끝난 회차는 기사가 없어도 위험으로 보이지 않는다", () => {
    expect(runAttention(run({ driverName: null, runStatus: "finished" }), now)).toBeUndefined();
  });

  it("운행 중에 지연이 있으면 주의(warn)이고 지연 알림 분을 사유로 쓴다", () => {
    expect(
      runAttention(
        run({ runStatus: "moving", delayMinutes: 10, lastDelayNotice: { minutes: 10, reason: null, sentAt: "2026-10-03T12:30:00+09:00", recipientCount: 4 } }),
        now,
      ),
    ).toMatchObject({ tone: "warn", reason: "10분 지연 알림" });
  });

  it("출발 10분 안인 확정 회차에 미확인이 있으면 주의이고 남은 분을 사유로 쓴다", () => {
    expect(
      runAttention(run({ runStatus: "confirmed", departTime: "2026-10-03T12:41:00+09:00", ackDriver: true, ackEscort: false }), now),
    ).toMatchObject({ tone: "warn", reason: "출발 6분 전" });
  });

  it("출발이 먼 확정 회차는 미확인이어도 조용하다", () => {
    expect(runAttention(run({ runStatus: "confirmed", departTime: "2026-10-03T13:13:00+09:00" }), now)).toBeUndefined();
  });
});
