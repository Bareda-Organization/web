import { apiFetch } from "@/shared/lib/http";
import type { ChangePasswordRequestTypes } from "../types";

// POST /auth/password (§2.8, AUTH-07) — 성공 시 기존 refresh 토큰 전량 무효화.
// ⚠ F2 화면 목록(BRIEF-web §1)에 비밀번호 변경 화면이 없어 UI 는 아직 연결하지 않았다.
// 존재·동작은 COMMON.md §2.1 이 배정한 staffB 계정으로 curl 실측한다(보고서 참고).
export const changePassword = async (request: ChangePasswordRequestTypes): Promise<void> => {
  await apiFetch<void>("/auth/password", {
    method: "POST",
    body: { current_password: request.currentPassword, new_password: request.newPassword },
  });
};
