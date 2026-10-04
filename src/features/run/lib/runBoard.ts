import type { DashboardRunResponseTypes } from "../types";

// 오늘 현황의 회차 계산 — 화면이 그리는 모양(4분류 막대 · 시간표 막대 · 행 긴급도)을 서버 값에서 뽑는 순수 함수 모음.

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
const HOUR_MS = 60 * MINUTE_MS;
// Ruling 827 — 도착 예정(`est_arrival_time`)이 null 인 회차의 막대 길이. 사양이 값을 정하지 않아 화면 상수로 둔다(스케줄 소요 시간 중간값).
export const DEFAULT_RUN_MINUTES = 40;
// 운행 시작 버튼은 출발 ±10분에만 켜진다(FEATURE_SPEC §2.1) — 그 안에 든 확정 회차의 미확인을 "출발 임박" 으로 본다.
const IMMINENT_MINUTES = 10;

const toMs = (raw: string): number => Date.parse(raw);

// 막대가 그릴 구간 — 실제 출발·도착이 있으면 그것, 없으면 예정(도착 예정도 없으면 기본 길이).
// 시각을 읽을 수 없으면(날짜 없는 "08:00" 같은 값) null — 그 회차는 막대를 그리지 않고 범위 계산에서도 뺀다.
const runSpan = (run: DashboardRunResponseTypes): { startMs: number; endMs: number } | null => {
  const startMs = toMs(run.startedAt ?? run.departTime);
  if (!Number.isFinite(startMs)) return null;
  const endRaw = run.finishedAt ?? run.estArrivalTime;
  const parsedEnd = endRaw ? toMs(endRaw) : Number.NaN;
  const endMs = Number.isFinite(parsedEnd) && parsedEnd > startMs ? parsedEnd : startMs + DEFAULT_RUN_MINUTES * MINUTE_MS;
  return { startMs, endMs };
};

export type TimetableRange = { startMs: number; endMs: number };

// 가장 이른 시작의 정시부터 가장 늦은 끝의 다음 정시까지. 회차가 없으면 지금 시각 앞뒤 한 시간.
export const timetableRange = (runs: DashboardRunResponseTypes[], nowMs: number = Date.now()): TimetableRange => {
  const spans = runs.map(runSpan).filter((span): span is { startMs: number; endMs: number } => span !== null);
  if (spans.length === 0) return { startMs: Math.floor(nowMs / HOUR_MS) * HOUR_MS, endMs: Math.ceil(nowMs / HOUR_MS) * HOUR_MS + HOUR_MS };
  const startMs = Math.floor(Math.min(...spans.map((span) => span.startMs)) / HOUR_MS) * HOUR_MS;
  const endMs = Math.ceil(Math.max(...spans.map((span) => span.endMs)) / HOUR_MS) * HOUR_MS;
  return { startMs, endMs: endMs > startMs ? endMs : startMs + HOUR_MS };
};

export const positionPct = (ms: number, range: TimetableRange): number => {
  const pct = ((ms - range.startMs) / (range.endMs - range.startMs)) * 100;
  return Math.min(100, Math.max(0, pct));
};

export const barGeometry = (run: DashboardRunResponseTypes, range: TimetableRange): { leftPct: number; widthPct: number } => {
  const span = runSpan(run);
  if (!span) return { leftPct: 0, widthPct: 0 };
  const { startMs, endMs } = span;
  const leftPct = positionPct(startMs, range);
  const rightPct = positionPct(endMs, range);
  return { leftPct, widthPct: Math.max(rightPct - leftPct, 1.5) };
};

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
