import { apiFetch } from "@/shared/lib/http";
import type { ChangePasswordRequestTypes } from "../types";

// POST /auth/password (§2.8, AUTH-07) — 성공 시 기존 refresh 토큰 전량 무효화.
// 비밀번호 변경 화면(`PasswordChangeButton`)이 이 함수를 쓴다.
export const changePassword = async (request: ChangePasswordRequestTypes): Promise<void> => {
  await apiFetch<void>("/auth/password", {
    method: "POST",
    body: { current_password: request.currentPassword, new_password: request.newPassword },
  });
};
