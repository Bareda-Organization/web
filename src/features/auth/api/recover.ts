import { apiFetch } from "@/shared/lib/http";
import type { RecoverAccountRequestTypes } from "../types";

// POST /auth/recover (§2.9, AUTH-08) — 비인증 허용.
// ⚠ F2 화면 목록에 복구 화면이 없어 UI 는 아직 연결하지 않았다(password.ts 와 같은 판단).
export const recoverAccount = async (request: RecoverAccountRequestTypes): Promise<void> => {
  await apiFetch<void>("/auth/recover", {
    method: "POST",
    body: {
      type: request.type,
      phone: request.phone,
      verification_code: request.verificationCode,
    },
  });
};
