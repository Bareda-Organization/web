// 하루 회차 시간표(회차별 막대 + 지금 세로선)의 계산 — 오늘 현황(run)과 일일 회차(schedule)가 같이 쓴다.
// 서버 값에서 그릴 구간만 뽑는 순수 함수 모음이라 화면 부품(`shared/ui/display/TimetableBar`)이 이 결과만 그린다.

/** 막대를 그릴 수 있는 회차의 최소 모양 — 오늘 현황 회차(실제·예정 출발/도착)와 일일 회차(출발 + 예상 소요 분)가 모두 만족한다. */
export type TimetableRun = {
  departTime: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  estArrivalTime?: string | null;
  /** 도착 예정이 없을 때 막대 길이(분) — §5.10 `est_duration_min` */
  estDurationMin?: number | null;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
// Ruling 827 — 도착 예정(`est_arrival_time`)이 null 인 회차의 막대 길이. 사양이 값을 정하지 않아 화면 상수로 둔다(스케줄 소요 시간 중간값).
export const DEFAULT_RUN_MINUTES = 40;

const toMs = (raw: string): number => Date.parse(raw);

// 막대가 그릴 구간 — 실제 출발·도착이 있으면 그것, 없으면 예정(도착 예정도 없으면 예상 소요 분, 그것도 없으면 기본 길이).
// 시각을 읽을 수 없으면(날짜 없는 "08:00" 같은 값) null — 그 회차는 막대를 그리지 않고 범위 계산에서도 뺀다.
export const runSpan = (run: TimetableRun): { startMs: number; endMs: number } | null => {
  const startMs = toMs(run.startedAt ?? run.departTime);
  if (!Number.isFinite(startMs)) return null;
  const endRaw = run.finishedAt ?? run.estArrivalTime;
  const parsedEnd = endRaw ? toMs(endRaw) : Number.NaN;
  if (Number.isFinite(parsedEnd) && parsedEnd > startMs) return { startMs, endMs: parsedEnd };
  const minutes = run.estDurationMin && run.estDurationMin > 0 ? run.estDurationMin : DEFAULT_RUN_MINUTES;
  return { startMs, endMs: startMs + minutes * MINUTE_MS };
};

export type TimetableRange = { startMs: number; endMs: number };

// 가장 이른 시작의 정시부터 가장 늦은 끝의 다음 정시까지. 회차가 없으면 지금 시각 앞뒤 한 시간.
export const timetableRange = (runs: TimetableRun[], nowMs: number = Date.now()): TimetableRange => {
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

export const barGeometry = (run: TimetableRun, range: TimetableRange): { leftPct: number; widthPct: number } => {
  const span = runSpan(run);
  if (!span) return { leftPct: 0, widthPct: 0 };
  const { startMs, endMs } = span;
  const leftPct = positionPct(startMs, range);
  const rightPct = positionPct(endMs, range);
  return { leftPct, widthPct: Math.max(rightPct - leftPct, 1.5) };
};
