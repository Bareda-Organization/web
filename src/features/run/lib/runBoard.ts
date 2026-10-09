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

// 지연 반영 예상 도착(ISO) — 저장된 예정 도착에 지연 분을 더한 화면 계산이라 운행 중 재계산 금지(Ruling 232)와 충돌하지 않는다(Ruling 843).
// 이미 도착했거나 · 지연이 없거나 · 예정 도착을 모르면(시각으로 읽을 수 없는 값 포함) null. 회차 표 출발 칸 설명과 회차 정보 카드가 함께 쓴다.
export const delayedArrival = (run: Pick<DashboardRunResponseTypes, "estArrivalTime" | "delayMinutes" | "finishedAt">): string | null => {
  const delay = run.delayMinutes ?? 0;
  const estimated = run.estArrivalTime ? toMs(run.estArrivalTime) : NaN;
  if (run.finishedAt || delay <= 0 || !Number.isFinite(estimated)) return null;
  return new Date(estimated + delay * MINUTE_MS).toISOString();
};

// 위치 유실 판정 기준 — 마지막 수신 후 2분 초과(API_SPEC §5.18 · Ruling 208). 서버가 이 기준을 넘긴 회차만 위치를 비우므로 유실 줄의 분은 2 이상이다.
const SIGNAL_LOST_MINUTES = 2;

// 위치 신호가 끊긴 회차의 한 줄 — "마지막 확인 N분 전"(분 단위, UF-M-05 · MON-07). 확인한 적이 없으면 대기 문구.
// 브라우저 시계가 서버보다 느려 N 이 기준 아래로 읽히면 기준값으로 맞춘다(유실 줄에 "방금" · 음수 분이 나오지 않게).
export const lastSeenLine = (lastSeenAt: string | null | undefined, nowMs: number): string => {
  const seen = lastSeenAt ? toMs(lastSeenAt) : NaN;
  if (!Number.isFinite(seen)) return "위치 확인 대기";
  const minutes = Math.max(SIGNAL_LOST_MINUTES, Math.floor((nowMs - seen) / MINUTE_MS));
  return `마지막 확인 ${minutes}분 전`;
};
