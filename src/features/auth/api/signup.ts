import { apiFetch } from "@/shared/lib/http";
import type { ReapplySignupResponseTypes, SignupRequestTypes, SignupResponseTypes } from "../types";

// POST /auth/signup (§2.2, AUTH-01) — 비인증 허용. 5개 역할 전 인원이 이 경로로 가입한다.
// 토큰을 반환하지 않는다 — 대기 화면 진입은 이 응답이 아니라 뒤이은 로그인이 만든다
// (AuthSessionProvider.signup 참고).
export const signup = async (request: SignupRequestTypes): Promise<SignupResponseTypes> => {
  const response = await apiFetch<{
    account_status: SignupResponseTypes["accountStatus"];
    requested_at: string;
    approver: SignupResponseTypes["approver"];
  }>("/auth/signup", {
    method: "POST",
    body: {
      role: request.role,
      login_id: request.loginId,
      password: request.password,
      name: request.name,
      phone: request.phone,
      academy_id: request.academyId,
    },
  });
  return {
    accountStatus: response.account_status,
    requestedAt: response.requested_at,
    approver: response.approver,
  };
};

// POST /auth/signup/reapply (§2.4) — rejected 계정 전용. 학원 재선택.
export const reapplySignup = async (academyId: string): Promise<ReapplySignupResponseTypes> => {
  const response = await apiFetch<{ status: ReapplySignupResponseTypes["status"]; requested_at: string }>(
    "/auth/signup/reapply",
    { method: "POST", body: { academy_id: academyId } },
  );
  return { status: response.status, requestedAt: response.requested_at };
};
