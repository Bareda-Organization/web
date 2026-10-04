// 대시보드(§6.18) 화면이 서버 값으로 계산·조립하는 순수 함수 — 서버가 주지 않는 파생값(진행률 · 직전 대비 · 학원별 상태 수 · 기록 문장)은 전부 여기서 한 번만 만든다.
import type { RunStatus } from "../types";
import type { DashboardDays, DashboardRecentEventResponseTypes, DashboardRunDirection, DashboardTodayRunResponseTypes } from "../types/dashboard";

export const directionLabel = (direction: DashboardRunDirection): string => (direction === "to_academy" ? "등원" : "하원");

/** 화면의 학원 칩 선택값("all" 또는 학원 id)을 요청 인자로 바꾼다 — 전체 학원이면 `academy_id` 를 아예 보내지 않는다. */
export const dashboardQuery = (days: DashboardDays, academy: string): { days: DashboardDays; academyId: string | undefined } => ({
  days,
  academyId: academy === "all" ? undefined : academy,
});

export type RunProgress = { kind: "percent"; value: number } | { kind: "before" } | { kind: "unknown" };

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

/**
 * 진행률 = (지금 − 출발) / (도착 예정 − 출발). 종료한 회차는 100, 출발 전은 퍼센트 없음(`before`).
 * 이동 중인데 도착 예정을 계산하지 못했으면(`null`) 0% 로 꾸미지 않고 `unknown` 으로 돌려준다(Ruling 827).
 */
export const runProgress = (run: DashboardTodayRunResponseTypes, nowMs: number): RunProgress => {
  if (run.runStatus === "finished") return { kind: "percent", value: 100 };
  if (run.runStatus !== "moving") return { kind: "before" };
  if (run.estArrivalTime === null) return { kind: "unknown" };
  const departMs = new Date(run.departTime).getTime();
  const arrivalMs = new Date(run.estArrivalTime).getTime();
  if (!(arrivalMs > departMs)) return { kind: "unknown" };
  return { kind: "percent", value: clampPercent(((nowMs - departMs) / (arrivalMs - departMs)) * 100) };
};

/** 정시 출발률 칸의 큰 숫자 — 분모 0 으로 서버가 `null` 을 주면 `—`. */
export const onTimeText = (rate: number | null): string => (rate === null ? "—" : String(Math.round(rate * 100)));

const DELTA_PERIOD_LABEL: Record<DashboardDays, string> = { 1: "어제", 7: "지난주", 30: "직전 30일" };

/** `지난주 대비 +2회` — 직전 같은 길이 기간과의 차이. */
export const runsDeltaText = (days: DashboardDays, current: number, previous: number): string => {
  const diff = current - previous;
  const signed = diff > 0 ? `+${diff}` : String(diff);
  return `${DELTA_PERIOD_LABEL[days]} 대비 ${signed}회`;
};

/** `어제의 2.1배` — 어제 성공이 0 이면 배수가 없어 null. */
export const loginGrowthText = (today: number, yesterday: number): string | null =>
  yesterday > 0 ? `어제의 ${(Math.round((today / yesterday) * 10) / 10).toFixed(1)}배` : null;

export type StatusCounts = Record<RunStatus, number>;
export type AcademyStatusRow = { academyId: string; academyName: string; total: number; counts: StatusCounts };

const emptyCounts = (): StatusCounts => ({ idle: 0, confirmed: 0, moving: 0, finished: 0 });

/** 오늘 회차를 학원별 · 상태별로 센다 — 학원은 처음 나온 순서, 전체 합계는 따로. */
export const academyStatusCounts = (runs: DashboardTodayRunResponseTypes[]): { byAcademy: AcademyStatusRow[]; all: AcademyStatusRow } => {
  const rows = new Map<string, AcademyStatusRow>();
  const all: AcademyStatusRow = { academyId: "all", academyName: "전체", total: 0, counts: emptyCounts() };
  for (const run of runs) {
    const row = rows.get(run.academyId) ?? { academyId: run.academyId, academyName: run.academyName, total: 0, counts: emptyCounts() };
    row.total += 1;
    row.counts[run.runStatus] += 1;
    all.total += 1;
    all.counts[run.runStatus] += 1;
    rows.set(run.academyId, row);
  }
  return { byAcademy: [...rows.values()], all };
};

const SEOUL_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const SEOUL_CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const SEOUL_MONTH_DAY = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });

/** 최근 기록의 시각 — 오늘이면 `12:41`, 이전 날짜면 `10/1`. */
export const eventTime = (at: string, now: Date = new Date()): string => {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "-";
  if (SEOUL_DAY.format(date) === SEOUL_DAY.format(now)) return SEOUL_CLOCK.format(date);
  return SEOUL_MONTH_DAY.format(date).replace(/\.\s*/g, "/").replace(/\/$/, "");
};

const runLabel = (event: DashboardRecentEventResponseTypes): string =>
  `${event.academyName} ${event.busNo ?? ""} ${event.direction ? directionLabel(event.direction) : ""}`.replace(/\s+/g, " ").trim();

const SIGNUP_STATUS_LABEL: Record<string, string> = { pending: "대기 중", active: "승인", rejected: "거절", blocked: "차단" };

/** 최근 기록 한 줄 — `하늘수학 3호차 등원 확정 · 변경 요청 3건 승인 대기`. */
export const eventSentence = (event: DashboardRecentEventResponseTypes): string => {
  switch (event.kind) {
    case "run_confirmed":
      return event.pendingChangeCount ? `${runLabel(event)} 확정 · 변경 요청 ${event.pendingChangeCount}건 승인 대기` : `${runLabel(event)} 확정`;
    case "run_started":
      return `${runLabel(event)} 출발`;
    case "run_finished":
      return `${runLabel(event)} 종료`;
    case "delay_notified":
      return `${runLabel(event)} ${event.delayMinutes ?? 0}분 지연 알림 발송`;
    case "staff_signup_requested": {
      const status = event.status ? (SIGNUP_STATUS_LABEL[event.status] ?? event.status) : "";
      return `${event.name ?? "관계자"} 가입 신청 · ${event.academyName}${status ? ` (${status})` : ""}`;
    }
  }
};
