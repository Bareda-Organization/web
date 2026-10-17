import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  PagingRequest,
  StaffAccountItemResponseTypes,
  StaffAccountStatus,
  StaffAccountsResponseTypes,
  UpdateStaffAccountRequestTypes,
  UpdateStaffAccountResponseTypes,
} from "../types";
import type { WithId } from "@/shared/lib/http/wireId";

// academyId 는 서버가 아직 안 주면 없다(§6.6, Ruling 807).
type WireStaffAccountItem = Omit<StaffAccountItemResponseTypes, "accountId" | "academyId"> & {
  accountId: string | number;
  academyId?: string | number;
};

// 서버 id 는 숫자 — 화면 타입은 문자열 (academyId 는 있을 때만)
const toStaffAccountItem = (raw: WireStaffAccountItem): StaffAccountItemResponseTypes => ({
  ...raw,
  accountId: asIdString(raw.accountId),
  academyId: raw.academyId === undefined ? undefined : asIdString(raw.academyId),
});

/** §6.6 쿼리(Ruling 807) — 학원 · 이름/아이디 검색 · 재직 상태. 안 주면 전부. */
export type StaffAccountFilter = { academyId?: string; q?: string; status?: StaffAccountStatus };

// GET /admin/staff-accounts (§6.6, O-02).
export const getStaffAccounts = async (paging: PagingRequest = {}, filter: StaffAccountFilter = {}): Promise<StaffAccountsResponseTypes> => {
  const raw = await apiFetch<Omit<StaffAccountsResponseTypes, "items"> & { items: WireStaffAccountItem[] }>("/admin/staff-accounts", {
    method: "GET",
    query: { academy_id: filter.academyId || undefined, q: filter.q || undefined, status: filter.status, page: paging.page, size: paging.size },
  });
  // counts 는 서버가 안 주면 null
  return { ...raw, counts: raw.counts ?? null, items: raw.items.map(toStaffAccountItem) };
};

// PATCH /admin/staff-accounts/{id} (§6.7, O-02). status=inactive 는 재직 상태만 바꾸며
// 계정 로그인 자체를 막는다 — 화면에서 "재직 해제" 문구로 안내한다.
export const updateStaffAccount = async (
  accountId: string,
  payload: UpdateStaffAccountRequestTypes,
): Promise<UpdateStaffAccountResponseTypes> => {
  const raw = await apiFetch<WithId<UpdateStaffAccountResponseTypes, "accountId">>(`/admin/staff-accounts/${accountId}`, {
    method: "PATCH",
    body: {
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      reset_password: payload.resetPassword,
      status: payload.status,
    },
  });
  // 서버 id 는 숫자 — 화면 타입은 문자열
  return { ...raw, accountId: asIdString(raw.accountId) };
};
