import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  AuditAction,
  AuditLogItemResponseTypes,
  AuditLogsResponseTypes,
  AuditQueryTypes,
  LoginHistoryBlockAction,
  LoginHistoryItemResponseTypes,
  LoginHistoryResponseTypes,
  LoginHistoryResult,
} from "../types";

type RawAuditLogItem = {
  actor: string;
  action: AuditAction;
  target_type: string;
  target_id: string | number;
  academy_name: string | null;
  occurred_at: string;
};

type RawAuditLogsResponse = {
  items: RawAuditLogItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toAuditLogItem = (raw: RawAuditLogItem): AuditLogItemResponseTypes => ({
  actor: raw.actor,
  action: raw.action,
  targetType: raw.target_type,
  targetId: asIdString(raw.target_id),
  academyName: raw.academy_name,
  occurredAt: raw.occurred_at,
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
  page: query.page,
  size: query.size,
});

// GET /admin/audit-logs (§6.13, SYS-01, O-04).
export const getAuditLogs = async (query: AuditQueryTypes = {}): Promise<AuditLogsResponseTypes> => {
  const raw = await apiFetch<RawAuditLogsResponse>("/admin/audit-logs", { method: "GET", query: toQuery(query) });
  return {
    items: raw.items.map(toAuditLogItem),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

type RawLoginHistoryItem = {
  account_id: string | number;
  login_id: string;
  result: LoginHistoryResult | null;
  ip: string;
  occurred_at: string;
  block_event: boolean;
  block_action: LoginHistoryBlockAction | null;
};

type RawLoginHistoryResponse = {
  items: RawLoginHistoryItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toLoginHistoryItem = (raw: RawLoginHistoryItem): LoginHistoryItemResponseTypes => ({
  accountId: asIdString(raw.account_id),
  loginId: raw.login_id,
  result: raw.result,
  ip: raw.ip,
  occurredAt: raw.occurred_at,
  blockEvent: raw.block_event,
  blockAction: raw.block_action ?? null,
});

// GET /admin/login-history (§6.13, SYS-02, O-04).
export const getLoginHistory = async (query: AuditQueryTypes = {}): Promise<LoginHistoryResponseTypes> => {
  const raw = await apiFetch<RawLoginHistoryResponse>("/admin/login-history", { method: "GET", query: toQuery(query) });
  return {
    items: raw.items.map(toLoginHistoryItem),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};
