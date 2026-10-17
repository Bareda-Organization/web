import { apiFetch } from "@/shared/lib/http";
import type { ReapplySignupResponseTypes, SignupRequestTypes, SignupResponseTypes } from "../types";

// POST /auth/signup (§2.2, AUTH-01) — 비인증 허용. 5개 역할 전 인원이 이 경로로 가입한다.
// 토큰을 반환하지 않는다 — 대기 화면 진입은 이 응답이 아니라 뒤이은 로그인이 만든다
// (AuthSessionProvider.signup 참고).
export const signup = (request: SignupRequestTypes): Promise<SignupResponseTypes> =>
  apiFetch<SignupResponseTypes>("/auth/signup", {
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

// POST /auth/signup/reapply (§2.4) — rejected 계정 전용. 학원 재선택.
export const reapplySignup = (academyId: string): Promise<ReapplySignupResponseTypes> =>
  apiFetch<ReapplySignupResponseTypes>("/auth/signup/reapply", { method: "POST", body: { academy_id: academyId } });
