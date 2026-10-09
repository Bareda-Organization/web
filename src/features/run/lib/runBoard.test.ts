import { describe, expect, it } from "vitest";
import type { DashboardRunResponseTypes } from "../types";
import { delayedArrival, lastSeenLine, runAttention, splitRiders } from "./runBoard";

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

// Ruling 843 · 848 — 회차 표의 출발 칸 설명과 회차 정보 카드가 같은 "지연 반영 예상 도착" 을 쓴다. 저장된 예정 도착에 지연 분을 더하는 화면 계산이다.
describe("delayedArrival — 지연 반영 예상 도착", () => {
  const delayed = { estArrivalTime: "2026-10-03T12:50:00+09:00", delayMinutes: 7, finishedAt: null };

  it("예정 도착에 지연 분을 더한 시각을 돌려준다", () => {
    expect(delayedArrival(delayed)).toBe("2026-10-03T03:57:00.000Z");
  });

  it.each([
    ["지연이 없으면", { delayMinutes: 0 }],
    ["지연을 모르면", { delayMinutes: null }],
    ["예정 도착을 모르면", { estArrivalTime: null }],
    ["예정 도착을 시각으로 읽을 수 없으면", { estArrivalTime: "08:35:00" }],
    ["이미 도착했으면", { finishedAt: "2026-10-03T13:00:00+09:00" }],
  ])("%s 돌려주지 않는다", (_name, patch) => {
    expect(delayedArrival({ ...delayed, ...patch })).toBeNull();
  });
});

// UF-M-05 · MON-07 — 위치 신호가 끊긴 회차는 "마지막 확인 N분 전" 을 보인다(분 단위).
// 유실 판정은 마지막 수신 후 2분 초과(Ruling 208)라 이 한 줄에는 언제나 2분 이상이 온다 — "방금" 이 나오는 입력은 없다.
describe("lastSeenLine — 위치 신호가 끊긴 회차의 한 줄", () => {
  const NOW = Date.parse("2026-10-03T03:30:00Z");

  it.each([
    [2 * 60_000 + 1_000, "마지막 확인 2분 전"],
    [5 * 60_000 + 20_000, "마지막 확인 5분 전"],
    [135 * 60_000, "마지막 확인 135분 전"],
  ])("%dms 전에 확인했으면 %s", (agoMs, expected) => {
    expect(lastSeenLine(new Date(NOW - agoMs).toISOString(), NOW)).toBe(expected);
  });

  // 브라우저 시계가 서버보다 느리면 마지막 수신이 "미래" 로 읽힌다 — 유실 줄에 "방금" 이나 음수 분을 찍지 않고 유실 기준(2분)으로 맞춘다.
  it.each([10_000, 59_000, -30_000])("%dms 전(유실 기준 미만 · 시계 어긋남 포함)이어도 방금·음수 분 없이 2분 전으로 적는다", (agoMs) => {
    const line = lastSeenLine(new Date(NOW - agoMs).toISOString(), NOW);
    expect(line).toBe("마지막 확인 2분 전");
    expect(line).not.toMatch(/방금|-\d/);
  });

  it("확인한 적이 없으면 위치 확인 대기", () => {
    expect(lastSeenLine(null, NOW)).toBe("위치 확인 대기");
  });
});
