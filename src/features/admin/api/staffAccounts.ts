import { apiFetch } from "@/shared/lib/http";
import type {
  StaffAccountItemResponseTypes,
  StaffAccountStatus,
  StaffAccountsResponseTypes,
  UpdateStaffAccountRequestTypes,
  UpdateStaffAccountResponseTypes,
} from "../types";

type RawStaffAccountItem = {
  account_id: number;
  name: string;
  login_id: string;
  phone: string;
  academy_name: string;
  last_login_at: string | null;
  status: StaffAccountStatus;
};

type RawStaffAccountsResponse = {
  items: RawStaffAccountItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toStaffAccountItem = (raw: RawStaffAccountItem): StaffAccountItemResponseTypes => ({
  accountId: raw.account_id,
  name: raw.name,
  loginId: raw.login_id,
  phone: raw.phone,
  academyName: raw.academy_name,
  lastLoginAt: raw.last_login_at,
  status: raw.status,
});

// GET /admin/staff-accounts (§6.6, O-02).
export const getStaffAccounts = async (): Promise<StaffAccountsResponseTypes> => {
  const raw = await apiFetch<RawStaffAccountsResponse>("/admin/staff-accounts", { method: "GET" });
  return {
    items: raw.items.map(toStaffAccountItem),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

type RawUpdateStaffAccountResponse = { account_id: number; temporary_password?: string };

// PATCH /admin/staff-accounts/{id} (§6.7, O-02). status=inactive 는 재직 상태만 바꾸며
// 계정 로그인 자체를 막는다 — 화면에서 "재직 해제" 문구로 안내한다(판단 근거, 보고서 §1).
export const updateStaffAccount = async (
  accountId: number,
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
  return { accountId: raw.account_id, temporaryPassword: raw.temporary_password };
};
