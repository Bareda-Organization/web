import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  DashboardAcademyMetricResponseTypes,
  DashboardAttentionResponseTypes,
  DashboardDays,
  DashboardDelayedRunResponseTypes,
  DashboardExpiringChangeResponseTypes,
  DashboardRecentEventResponseTypes,
  DashboardResponseTypes,
  DashboardSignupBlockedResponseTypes,
  DashboardTodayRunResponseTypes,
} from "../types/dashboard";
import type { WithId } from "@/shared/lib/http/wireId";

// 서버가 아직 키를 안 보내는 새 필드(백엔드 병합 전)가 있어 배열 · 수는 선택으로 받고 아래에서 빈 배열 · 0 으로 채운다.
type WireAttention = {
  signupBlocked?: WithId<DashboardSignupBlockedResponseTypes, "requestId">[];
  delayedRuns?: WithId<DashboardDelayedRunResponseTypes, "runId">[];
  expiringChangeRequests?: WithId<DashboardExpiringChangeResponseTypes, "runId">[];
  unackedEmergencies?: number;
  staleRuns?: number;
  confirmFailedRuns?: number;
  blockedAccounts?: number;
};

type WireRecentEvent = Pick<DashboardRecentEventResponseTypes, "at" | "kind" | "academyName"> &
  Partial<Omit<DashboardRecentEventResponseTypes, "runId" | "at" | "kind" | "academyName">> & { runId?: string | number | null };

type WireDashboard = Omit<
  DashboardResponseTypes,
  "daily" | "academies" | "attention" | "todayRuns" | "health" | "recentEvents"
> & {
  daily?: DashboardResponseTypes["daily"];
  academies?: WithId<DashboardAcademyMetricResponseTypes, "academyId">[];
  attention?: WireAttention;
  todayRuns?: WithId<DashboardTodayRunResponseTypes, "runId" | "academyId">[];
  health?: DashboardResponseTypes["health"];
  recentEvents?: WireRecentEvent[];
};

const orNull = <T>(value: T | null | undefined): T | null => value ?? null;

// 서버 id 는 숫자 — 화면 타입은 문자열
const toAttention = (raw: WireAttention = {}): DashboardAttentionResponseTypes => ({
  signupBlocked: (raw.signupBlocked ?? []).map((item) => ({ ...item, requestId: asIdString(item.requestId) })),
  delayedRuns: (raw.delayedRuns ?? []).map((item) => ({ ...item, runId: asIdString(item.runId) })),
  expiringChangeRequests: (raw.expiringChangeRequests ?? []).map((item) => ({ ...item, runId: asIdString(item.runId) })),
  unackedEmergencies: raw.unackedEmergencies ?? 0,
  staleRuns: raw.staleRuns ?? 0,
  confirmFailedRuns: raw.confirmFailedRuns ?? 0,
  blockedAccounts: raw.blockedAccounts ?? 0,
});

// GET /admin/dashboard (§6.18, Ruling 801). `days` 는 1·7·30, `academyId` 를 주면 그 학원만(로그인·시스템 상태·차단 계정은 학원과 무관).
export const getDashboard = async (days: DashboardDays, academyId?: string): Promise<DashboardResponseTypes> => {
  const raw = await apiFetch<WireDashboard>("/admin/dashboard", {
    method: "GET",
    query: { days, academy_id: academyId || undefined },
  });
  return {
    ...raw,
    daily: raw.daily ?? [],
    academies: (raw.academies ?? []).map((academy) => ({ ...academy, academyId: asIdString(academy.academyId) })),
    attention: toAttention(raw.attention),
    todayRuns: (raw.todayRuns ?? []).map((run) => ({ ...run, runId: asIdString(run.runId), academyId: asIdString(run.academyId) })),
    health: raw.health ?? [],
    recentEvents: (raw.recentEvents ?? []).map((event) => ({
      at: event.at,
      kind: event.kind,
      academyName: event.academyName,
      runId: event.runId === undefined || event.runId === null ? null : asIdString(event.runId),
      busNo: orNull(event.busNo),
      direction: orNull(event.direction),
      delayMinutes: orNull(event.delayMinutes),
      pendingChangeCount: orNull(event.pendingChangeCount),
      name: orNull(event.name),
      status: orNull(event.status),
    })),
  };
};
