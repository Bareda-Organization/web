import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  PagingRequest,
  AccountRole,
  BlockedAccountItemResponseTypes,
  BlockedAccountsResponseTypes,
  UnblockAccountResponseTypes,
} from "../types";

type RawBlockedAccountItem = {
  account_id: string | number;
  login_id: string;
  name: string;
  academy_name: string;
  blocked_at: string;
  failed_attempts: number;
  reason: string;
  role: AccountRole;
  status_before_block: "active" | "pending" | "rejected";
};

type RawBlockedAccountsResponse = {
  items: RawBlockedAccountItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toBlockedAccountItem = (raw: RawBlockedAccountItem): BlockedAccountItemResponseTypes => ({
  accountId: asIdString(raw.account_id),
  loginId: raw.login_id,
  name: raw.name,
  academyName: raw.academy_name,
  blockedAt: raw.blocked_at,
  failedAttempts: raw.failed_attempts,
  reason: raw.reason,
  role: raw.role,
  statusBeforeBlock: raw.status_before_block,
});

// GET /admin/blocked-accounts (§6.10, O-03). BRIEF-a1.md §4.2 — 누가 왜 차단됐는지
// (failedAttempts·reason) 없이는 해제 여부를 판단할 수 없어 목록에 그대로 노출한다.
export const getBlockedAccounts = async (paging: PagingRequest = {}): Promise<BlockedAccountsResponseTypes> => {
  const raw = await apiFetch<RawBlockedAccountsResponse>("/admin/blocked-accounts", {
    method: "GET",
    query: { page: paging.page, size: paging.size },
  });
  return {
    items: raw.items.map(toBlockedAccountItem),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

type RawUnblockResponse = { account_status: "active"; unblocked_by: string; unblocked_at: string };

// POST /admin/blocked-accounts/{id}/unblock (§6.12, O-03). 요청 본문 없음.
export const unblockAccount = async (accountId: string): Promise<UnblockAccountResponseTypes> => {
  const raw = await apiFetch<RawUnblockResponse>(`/admin/blocked-accounts/${accountId}/unblock`, {
    method: "POST",
  });
  return { accountStatus: raw.account_status, unblockedBy: raw.unblocked_by, unblockedAt: raw.unblocked_at };
};
