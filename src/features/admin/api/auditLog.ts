import { apiFetch } from "@/shared/lib/http";
import type {
  AuditAction,
  AuditLogItemResponseTypes,
  AuditLogsResponseTypes,
  AuditQueryTypes,
  LoginHistoryItemResponseTypes,
  LoginHistoryResponseTypes,
  LoginHistoryResult,
} from "../types";

type RawAuditLogItem = {
  actor: string;
  action: AuditAction;
  target_type: string;
  target_id: number;
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
  targetId: raw.target_id,
  academyName: raw.academy_name,
  occurredAt: raw.occurred_at,
});

const toQuery = (query: AuditQueryTypes) => ({
  academy_id: query.academyId,
  account_id: query.accountId,
  from: query.from,
  to: query.to,
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
  account_id: number;
  login_id: string;
  result: LoginHistoryResult;
  ip: string;
  occurred_at: string;
  block_event: boolean;
};

type RawLoginHistoryResponse = {
  items: RawLoginHistoryItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toLoginHistoryItem = (raw: RawLoginHistoryItem): LoginHistoryItemResponseTypes => ({
  accountId: raw.account_id,
  loginId: raw.login_id,
  result: raw.result,
  ip: raw.ip,
  occurredAt: raw.occurred_at,
  blockEvent: raw.block_event,
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
