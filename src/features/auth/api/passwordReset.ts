import { apiFetch } from "@/shared/lib/http";
import type { AccountPasswordResetResponseTypes } from "../types";

type RawAccountPasswordReset = { account_id: string; login_id: string; temporary_password: string };

// POST /staff/accounts/{accountId}/password-reset (§5.22, AUTH-08 · Ruling 329) — 관리자 경유 복구.
// 임시 비밀번호는 응답에 1회만 실린다 — 저장하거나 로그에 남기지 않는다.
export const resetAccountPassword = async (accountId: string): Promise<AccountPasswordResetResponseTypes> => {
  const raw = await apiFetch<RawAccountPasswordReset>(`/staff/accounts/${accountId}/password-reset`, {
    method: "POST",
  });
  return { accountId: raw.account_id, loginId: raw.login_id, temporaryPassword: raw.temporary_password };
};
