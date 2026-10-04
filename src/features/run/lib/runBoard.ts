import type { DashboardRunResponseTypes } from "../types";

// 오늘 현황의 회차 계산 — 화면이 그리는 모양(4분류 막대 · 행 긴급도)을 서버 값에서 뽑는 순수 함수 모음. 시간표 막대 계산은 일일 회차(schedule)와 함께 쓰려고 `shared/lib/timetable` 로 올렸다.

export type RiderSplit = { boarded: number; noShow: number; absent: number; waiting: number };

// Ruling 810 — 서버는 회차별 미승차·미등원 수만 준다. 대기는 `total − 탑승 − 미승차 − 미등원` 으로 화면이 계산한다.
export const splitRiders = (run: Pick<DashboardRunResponseTypes, "totalCount" | "boardedCount" | "noShowCount" | "absentCount">): RiderSplit => ({
  boarded: run.boardedCount,
  noShow: run.noShowCount,
  absent: run.absentCount,
  waiting: Math.max(0, run.totalCount - run.boardedCount - run.noShowCount - run.absentCount),
});

export const sumRiders = (runs: DashboardRunResponseTypes[]): RiderSplit & { total: number } =>
  runs.reduce(
    (sum, run) => {
      const split = splitRiders(run);
      return {
        boarded: sum.boarded + split.boarded,
        noShow: sum.noShow + split.noShow,
        absent: sum.absent + split.absent,
        waiting: sum.waiting + split.waiting,
        total: sum.total + run.totalCount,
      };
    },
    { boarded: 0, noShow: 0, absent: 0, waiting: 0, total: 0 },
  );

const MINUTE_MS = 60_000;
// 운행 시작 버튼은 출발 ±10분에만 켜진다(FEATURE_SPEC §2.1) — 그 안에 든 확정 회차의 미확인을 "출발 임박" 으로 본다.
const IMMINENT_MINUTES = 10;

const toMs = (raw: string): number => Date.parse(raw);

export type RunAttention = { tone: "bad" | "warn"; reason: string };

// 행의 긴급도 — 기사 미배치는 위험(◆), 지연·출발 임박 미확인은 주의(▲). 끝난 회차는 조용히 둔다.
export const runAttention = (run: DashboardRunResponseTypes, nowMs: number): RunAttention | undefined => {
  if (run.runStatus === "finished") return undefined;
  if (run.driverName === null) return { tone: "bad", reason: "기사 미배치" };
  if (run.runStatus === "moving") {
    const delayed = run.lastDelayNotice?.minutes ?? ((run.delayMinutes ?? 0) > 0 ? run.delayMinutes : null);
    if (delayed) return { tone: "warn", reason: `${delayed}분 지연 알림` };
    return undefined;
  }
  if (run.runStatus === "confirmed" && (!run.ackDriver || !run.ackEscort)) {
    const minutesLeft = Math.ceil((toMs(run.departTime) - nowMs) / MINUTE_MS);
    if (Number.isFinite(minutesLeft) && minutesLeft >= 0 && minutesLeft <= IMMINENT_MINUTES) return { tone: "warn", reason: `출발 ${minutesLeft}분 전` };
  }
  return undefined;
};
