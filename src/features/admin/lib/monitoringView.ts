// 전체 관제(§6.8 · §6.15) 화면의 순수 계산 — 시간표 막대 · 상태 메모 · 지표 요약. 화면은 이 결과만 그린다.
import { formatClockTime } from "@/shared/lib/format/clockTime";
import type { AcademySummaryResponseTypes, RunAttentionTodayItemTypes, RunLiveItemResponseTypes, RunStatus } from "../types";
import { untilText } from "./relativeTime";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const KST_OFFSET_MS = 9 * HOUR_MS;

/** 도착 예정을 계산하지 못한 회차의 시간표 막대 길이 — 없는 도착 시각을 지어내지 않고 출발부터 이 길이로 그린다(Ruling 827). */
export const DEFAULT_BAR_MINUTES = 40;

export type Axis = { startMs: number; endMs: number };

// 서울(UTC+9, 서머타임 없음) 정시로 내림 · 올림.
const floorHour = (valueMs: number) => Math.floor((valueMs + KST_OFFSET_MS) / HOUR_MS) * HOUR_MS - KST_OFFSET_MS;
const ceilHour = (valueMs: number) => Math.ceil((valueMs + KST_OFFSET_MS) / HOUR_MS) * HOUR_MS - KST_OFFSET_MS;

const endOf = (run: RunLiveItemResponseTypes): number =>
  run.destinationEta ? new Date(run.destinationEta).getTime() : new Date(run.departTime).getTime() + DEFAULT_BAR_MINUTES * MINUTE_MS;

const SEOUL_CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** ms → `HH:mm`(서울). 읽을 수 없는 값(시험의 짧은 시각 문자열 등)은 `–`. */
export const clockOfMs = (valueMs: number): string => (Number.isFinite(valueMs) ? SEOUL_CLOCK.format(new Date(valueMs)) : "–");

/** 하루 회차의 막대가 들어가는 가로축 — 가장 이른 출발 ~ 가장 늦은 도착을 정시로 감싼다(최소 한 시간). */
export const timetableAxis = (runs: RunLiveItemResponseTypes[]): Axis => {
  if (runs.length === 0) {
    const now = Date.now();
    return { startMs: floorHour(now), endMs: floorHour(now) + HOUR_MS };
  }
  // 읽을 수 없는 시각(NaN)은 축 계산에서 뺀다 — 하나라도 섞이면 축 전체가 NaN 이 된다.
  const departs = runs.map((run) => new Date(run.departTime).getTime()).filter(Number.isFinite);
  const ends = runs.map(endOf).filter(Number.isFinite);
  if (departs.length === 0) return timetableAxis([]);
  const startMs = floorHour(Math.min(...departs));
  const endMs = Math.max(ceilHour(Math.max(...ends, ...departs)), startMs + HOUR_MS);
  return { startMs, endMs };
};

export type BarGeometry = { left: number; width: number; estimated: boolean };

const percent = (valueMs: number, axis: Axis) => ((valueMs - axis.startMs) / (axis.endMs - axis.startMs)) * 100;

/** 출발 → 도착 예정 막대의 위치(왼쪽 %, 폭 %). 도착 예정이 없으면 기본 길이로 그리고 `estimated` 를 켠다. */
export const barGeometry = (run: RunLiveItemResponseTypes, axis: Axis): BarGeometry => {
  const left = percent(new Date(run.departTime).getTime(), axis);
  const width = percent(endOf(run), axis) - left;
  // 시각을 읽을 수 없으면(NaN) 막대를 그리지 않는다(폭 0).
  if (!Number.isFinite(left) || !Number.isFinite(width)) return { left: 0, width: 0, estimated: run.destinationEta === null };
  return { left, width: Math.max(width, 1.5), estimated: run.destinationEta === null };
};

/** 지금 세로선의 위치(%) — 축 밖이면 null. */
export const nowPercent = (nowMs: number, axis: Axis): number | null => (nowMs >= axis.startMs && nowMs <= axis.endMs ? percent(nowMs, axis) : null);

const hasPassedDepart = (run: RunLiveItemResponseTypes, nowMs: number) => new Date(run.departTime).getTime() <= nowMs;

/** 상태 칩 아래 한 줄 — 이동 중은 위치 수신 시각, 출발이 지났는데 시작 전이면 경과, 미배치는 그 사실. 말할 것이 없으면 null. */
export const runStatusNote = (run: RunLiveItemResponseTypes, nowMs: number): string | null => {
  if (run.runStatus === "moving") {
    if (run.position) return `위치 수신 ${formatClockTime(run.position.receivedAt)}`;
    return run.lastSeenAt ? `마지막 수신 ${formatClockTime(run.lastSeenAt)}` : "위치 확인 대기";
  }
  if (run.runStatus === "finished") return null;
  if ((run.runStatus === "confirmed" || run.runStatus === "idle") && hasPassedDepart(run, nowMs)) {
    return `출발 시각 ${untilText(run.departTime, new Date(nowMs)).replace(" 지남", "")} 경과 · 운행 시작 전`;
  }
  if (!run.driver && !run.escort) return "기사 · 동승자 미배치";
  if (!run.driver) return "기사 미배치";
  if (!run.escort) return "동승자 미배치";
  return null;
};

export type TodaySummary = {
  total: number;
  moving: number;
  delayed: number;
  confirmFailed: number;
  openEmergencies: number;
  byStatus: Record<RunStatus, number>;
  /** 칸마다 학원별 내역 한 줄 — "하늘수학 6 · 새봄영어 2" */
  perAcademy: { total: string; moving: string; delayed: string; confirmFailed: string; emergencies: string };
};

const join = (parts: [string, number][]): string =>
  parts
    .filter(([, value]) => value > 0)
    .map(([name, value]) => `${name} ${value}`)
    .join(" · ");

/** §6.15 `today[]`(전 학원 오늘 회차 요약)와 학원별 미확인 비상 수로 지표 5칸을 센다. */
export const summarizeToday = (today: RunAttentionTodayItemTypes[], openEmergencyCounts: Record<string, number>): TodaySummary => {
  const sum = (pick: (item: RunAttentionTodayItemTypes) => number) => today.reduce((total, item) => total + pick(item), 0);
  const byStatus: Record<RunStatus, number> = {
    idle: sum((item) => item.byStatus.idle),
    confirmed: sum((item) => item.byStatus.confirmed),
    moving: sum((item) => item.byStatus.moving),
    finished: sum((item) => item.byStatus.finished),
  };
  const emergencyEntries: [string, number][] = today.map((item) => [item.academyName, openEmergencyCounts[item.academyId] ?? 0]);
  return {
    total: sum((item) => item.runCount),
    moving: byStatus.moving,
    delayed: sum((item) => item.delayedRuns),
    confirmFailed: sum((item) => item.confirmFailedRuns),
    openEmergencies: emergencyEntries.reduce((total, [, value]) => total + value, 0),
    byStatus,
    perAcademy: {
      total: join(today.map((item) => [item.academyName, item.runCount])),
      moving: join(today.map((item) => [item.academyName, item.byStatus.moving])),
      delayed: join(today.map((item) => [item.academyName, item.delayedRuns])),
      confirmFailed: join(today.map((item) => [item.academyName, item.confirmFailedRuns])),
      emergencies: join(emergencyEntries),
    },
  };
};

// ── 학원 레일 정렬 · 처음 고르는 학원 ─────────────────────────────────────
const attentionScore = (academyId: string, today: RunAttentionTodayItemTypes[], openEmergencyCounts: Record<string, number>): number => {
  const row = today.find((item) => item.academyId === academyId);
  return (openEmergencyCounts[academyId] ?? 0) * 100 + (row?.confirmFailedRuns ?? 0) * 10 + (row?.delayedRuns ?? 0);
};

/** "문제 있는 곳 먼저" — 미확인 비상 · 확정 실패 · 지연 순으로 앞에 오고, 같으면 학원 이름순. 레일과 처음 고르는 학원이 같은 정렬을 쓴다. */
export const sortAcademiesByAttention = (
  academies: AcademySummaryResponseTypes[],
  today: RunAttentionTodayItemTypes[],
  openEmergencyCounts: Record<string, number>,
): AcademySummaryResponseTypes[] =>
  [...academies].sort(
    (a, b) => attentionScore(b.id, today, openEmergencyCounts) - attentionScore(a.id, today, openEmergencyCounts) || a.name.localeCompare(b.name, "ko"),
  );

/** 전체 관제가 처음 여는 학원(Ruling 838) — 정렬된 맨 위가 문제 있는 학원이면 그곳, 문제 있는 학원이 없으면 첫 운영 중 학원(없으면 첫 학원). */
export const pickInitialAcademyId = (
  academies: AcademySummaryResponseTypes[],
  today: RunAttentionTodayItemTypes[],
  openEmergencyCounts: Record<string, number>,
): string | null => {
  const top = sortAcademiesByAttention(academies, today, openEmergencyCounts)[0];
  if (top && attentionScore(top.id, today, openEmergencyCounts) > 0) return top.id;
  return (academies.find((academy) => academy.status === "active") ?? academies[0])?.id ?? null;
};
