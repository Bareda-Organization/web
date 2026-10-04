// §6.18 GET /admin/dashboard — 메인 관리자 첫 화면(Ruling 800 · 801)이 30초마다 한 번 읽는 집계. snake_case ↔ camelCase 는 api/dashboard.ts 한 곳에서 바꾼다.
import type { RunStatus } from "./index";

/** 기간 칩 — 오늘 · 7일 · 30일(`days` 쿼리 값). */
export type DashboardDays = 1 | 7 | 30;

export type DashboardDailyResponseTypes = {
  date: string;
  runCount: number;
  delayCount: number;
  loginSuccess: number;
  loginFail: number;
};

export type DashboardAcademyMetricResponseTypes = {
  academyId: string;
  academyName: string;
  runCount: number;
  onTimeRate: number | null;
  delayCount: number;
  emergencyCount: number;
  changeRequestCount: number;
};

export type DashboardRunDirection = "to_academy" | "from_academy";

export type DashboardTodayRunResponseTypes = {
  runId: string;
  academyId: string;
  academyName: string;
  busNo: string;
  direction: DashboardRunDirection;
  departTime: string;
  // 도착 예정 — 계산할 수 없으면 null(§5.3 과 같은 계산). 진행률 막대는 이때 기본 길이로 그린다(Ruling 827).
  estArrivalTime: string | null;
  runStatus: RunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  delayMinutes: number | null;
  stopsDone: number | null;
  stopsTotal: number | null;
  pendingChangeCount: number;
  driverAssigned: boolean;
};

export type DashboardHealthKey = "api" | "position" | "confirm_batch" | "notification";

export type DashboardHealthResponseTypes = {
  key: DashboardHealthKey;
  status: "ok" | "warn" | "down";
  detail: string | null;
};

export type DashboardEventKind = "run_confirmed" | "run_started" | "run_finished" | "delay_notified" | "staff_signup_requested";

export type DashboardRecentEventResponseTypes = {
  at: string;
  kind: DashboardEventKind;
  academyName: string;
  runId: string | null;
  busNo: string | null;
  direction: DashboardRunDirection | null;
  delayMinutes: number | null;
  pendingChangeCount: number | null;
  name: string | null;
  // §9.2 가입 요청의 지금 상태 — `pending` 이면 "대기 중".
  status: string | null;
};

export type DashboardSignupBlockedResponseTypes = {
  requestId: string;
  name: string;
  academyName: string;
  requestedAt: string;
};

export type DashboardDelayedRunResponseTypes = {
  runId: string;
  academyName: string;
  busNo: string;
  direction: DashboardRunDirection;
  delayMinutes: number | null;
};

export type DashboardExpiringChangeResponseTypes = {
  runId: string;
  academyName: string;
  busNo: string;
  direction: DashboardRunDirection;
  deadlineAt: string;
  count: number;
};

export type DashboardAttentionResponseTypes = {
  signupBlocked: DashboardSignupBlockedResponseTypes[];
  delayedRuns: DashboardDelayedRunResponseTypes[];
  expiringChangeRequests: DashboardExpiringChangeResponseTypes[];
  unackedEmergencies: number;
  staleRuns: number;
  confirmFailedRuns: number;
  blockedAccounts: number;
};

export type DashboardResponseTypes = {
  asOf: string;
  period: { from: string; to: string; days: number };
  runs: { count: number; previousCount: number; canceledCount: number };
  onTime: { rate: number | null; onTimeCount: number; startedCount: number; targetRate: number };
  delays: { count: number; todayCount: number; peak: { date: string; count: number } | null };
  changeRequests: { approved: number; rejected: number; autoRejected: number; total: number };
  logins: { success: number; fail: number; todaySuccess: number; yesterdaySuccess: number; blocks: number; blocksReleased: number };
  daily: DashboardDailyResponseTypes[];
  academies: DashboardAcademyMetricResponseTypes[];
  attention: DashboardAttentionResponseTypes;
  todayRuns: DashboardTodayRunResponseTypes[];
  health: DashboardHealthResponseTypes[];
  recentEvents: DashboardRecentEventResponseTypes[];
};
