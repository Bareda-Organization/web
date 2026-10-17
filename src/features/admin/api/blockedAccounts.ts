import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  PagingRequest,
  BlockedAccountItemResponseTypes,
  BlockedAccountsResponseTypes,
  UnblockAccountResponseTypes,
} from "../types";
import type { WithId } from "./wireId";

type WireBlockedAccountItem = WithId<BlockedAccountItemResponseTypes, "accountId">;

// 서버 id 는 숫자 — 화면 타입은 문자열
const toBlockedAccountItem = (raw: WireBlockedAccountItem): BlockedAccountItemResponseTypes => ({
  ...raw,
  accountId: asIdString(raw.accountId),
});

// GET /admin/blocked-accounts (§6.10, O-03). 누가 왜 차단됐는지(failedAttempts·reason) 없이는 해제 여부를 판단할 수 없어 목록에 그대로 노출한다.
export const getBlockedAccounts = async (paging: PagingRequest = {}): Promise<BlockedAccountsResponseTypes> => {
  const raw = await apiFetch<Omit<BlockedAccountsResponseTypes, "items"> & { items: WireBlockedAccountItem[] }>(
    "/admin/blocked-accounts",
    { method: "GET", query: { page: paging.page, size: paging.size } },
  );
  return { ...raw, items: raw.items.map(toBlockedAccountItem) };
};

// POST /admin/blocked-accounts/{id}/unblock (§6.12, O-03). 요청 본문 없음.
export const unblockAccount = async (accountId: string): Promise<UnblockAccountResponseTypes> =>
  apiFetch<UnblockAccountResponseTypes>(`/admin/blocked-accounts/${accountId}/unblock`, { method: "POST" });
