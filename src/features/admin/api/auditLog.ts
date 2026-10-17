import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  AuditActorResponseTypes,
  AuditLogItemResponseTypes,
  AuditLogsResponseTypes,
  AuditQueryTypes,
  LoginHistoryItemResponseTypes,
  LoginHistoryResponseTypes,
} from "../types";
import type { WithId } from "@/shared/lib/http/wireId";

type WireAuditLogItem = WithId<AuditLogItemResponseTypes, "targetId">;

// 서버 id 는 숫자 · 서버가 안 주는 칸은 null (Ruling 809)
const toAuditLogItem = (raw: WireAuditLogItem): AuditLogItemResponseTypes => ({
  ...raw,
  actorName: raw.actorName ?? null,
  detailAction: raw.detailAction ?? null,
  ip: raw.ip ?? null,
  targetId: asIdString(raw.targetId),
});

// 화면의 날짜 칸(YYYY-MM-DD)을 서울 기준 그날의 시작·끝 시각으로 — 서버(§1 "ISO-8601 + 오프셋")는 날짜만 받으면 422 다.
const SEOUL_OFFSET = "+09:00";
const toSeoulStart = (date?: string) => (date ? `${date}T00:00:00${SEOUL_OFFSET}` : undefined);
const toSeoulEnd = (date?: string) => (date ? `${date}T23:59:59${SEOUL_OFFSET}` : undefined);

const toQuery = (query: AuditQueryTypes) => ({
  academy_id: query.academyId,
  account_id: query.accountId,
  from: toSeoulStart(query.from),
  to: toSeoulEnd(query.to),
  action: query.action,
  page: query.page,
  size: query.size,
});

// GET /admin/audit-logs (§6.13, SYS-01, O-04).
export const getAuditLogs = async (query: AuditQueryTypes = {}): Promise<AuditLogsResponseTypes> => {
  const raw = await apiFetch<Omit<AuditLogsResponseTypes, "items"> & { items: WireAuditLogItem[] }>("/admin/audit-logs", {
    method: "GET",
    query: toQuery(query),
  });
  return { ...raw, items: raw.items.map(toAuditLogItem) };
};

type WireLoginHistoryItem = WithId<LoginHistoryItemResponseTypes, "accountId">;

// 서버 id 는 숫자 · 해제 행은 IP 가 null 이거나 키가 없다(§6.13) · 서버가 안 주는 칸은 null (Ruling 846)
const toLoginHistoryItem = (raw: WireLoginHistoryItem): LoginHistoryItemResponseTypes => ({
  ...raw,
  accountId: asIdString(raw.accountId),
  ip: raw.ip ?? null,
  blockAction: raw.blockAction ?? null,
  unblockedByName: raw.unblockedByName ?? null,
});

// GET /admin/login-history (§6.13, SYS-02, O-04).
export const getLoginHistory = async (query: AuditQueryTypes = {}): Promise<LoginHistoryResponseTypes> => {
  const raw = await apiFetch<Omit<LoginHistoryResponseTypes, "items"> & { items: WireLoginHistoryItem[] }>("/admin/login-history", {
    method: "GET",
    query: toQuery(query),
  });
  return { ...raw, items: raw.items.map(toLoginHistoryItem) };
};

// GET /admin/audit-actors (§6.13, Ruling 447) — 서버가 20건에서 자르므로 페이징이 없다.
export const getAuditActors = async (q: string): Promise<AuditActorResponseTypes[]> => {
  const raw = await apiFetch<{ items: WithId<AuditActorResponseTypes, "accountId">[] }>("/admin/audit-actors", {
    method: "GET",
    query: { q },
  });
  // 서버 id 는 숫자 — 화면 타입은 문자열
  return raw.items.map((item) => ({ ...item, accountId: asIdString(item.accountId) }));
};
