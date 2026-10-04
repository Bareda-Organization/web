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

type RawStaffAccountItem = {
  account_id: string | number;
  name: string;
  login_id: string;
  phone: string;
  academy_name: string;
  // §6.6(Ruling 807) — 서버가 아직 안 주면 없다.
  academy_id?: string | number;
  academy_pending_signup_count?: number;
  last_login_at: string | null;
  status: StaffAccountStatus;
};

type RawStaffAccountsResponse = {
  counts?: { active: number; inactive: number } | null;
  items: RawStaffAccountItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toStaffAccountItem = (raw: RawStaffAccountItem): StaffAccountItemResponseTypes => ({
  accountId: asIdString(raw.account_id),
  name: raw.name,
  loginId: raw.login_id,
  phone: raw.phone,
  academyName: raw.academy_name,
  academyId: raw.academy_id === undefined ? undefined : asIdString(raw.academy_id),
  academyPendingSignupCount: raw.academy_pending_signup_count,
  lastLoginAt: raw.last_login_at,
  status: raw.status,
});

/** §6.6 쿼리(Ruling 807) — 학원 · 이름/아이디 검색 · 재직 상태. 안 주면 전부. */
export type StaffAccountFilter = { academyId?: string; q?: string; status?: StaffAccountStatus };

// GET /admin/staff-accounts (§6.6, O-02).
export const getStaffAccounts = async (paging: PagingRequest = {}, filter: StaffAccountFilter = {}): Promise<StaffAccountsResponseTypes> => {
  const raw = await apiFetch<RawStaffAccountsResponse>("/admin/staff-accounts", {
    method: "GET",
    query: { academy_id: filter.academyId || undefined, q: filter.q || undefined, status: filter.status, page: paging.page, size: paging.size },
  });
  return {
    counts: raw.counts ?? null,
    items: raw.items.map(toStaffAccountItem),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

type RawUpdateStaffAccountResponse = { account_id: string | number; temporary_password?: string };

// PATCH /admin/staff-accounts/{id} (§6.7, O-02). status=inactive 는 재직 상태만 바꾸며
// 계정 로그인 자체를 막는다 — 화면에서 "재직 해제" 문구로 안내한다(판단 근거, 보고서 §1).
export const updateStaffAccount = async (
  accountId: string,
  payload: UpdateStaffAccountRequestTypes,
): Promise<UpdateStaffAccountResponseTypes> => {
  const raw = await apiFetch<RawUpdateStaffAccountResponse>(`/admin/staff-accounts/${accountId}`, {
    method: "PATCH",
    body: {
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      reset_password: payload.resetPassword,
      status: payload.status,
    },
  });
  return { accountId: asIdString(raw.account_id), temporaryPassword: raw.temporary_password };
};
