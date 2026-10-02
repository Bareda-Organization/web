import { apiFetch } from "@/shared/lib/http";
import type { SignupStatusResponseTypes } from "../types";

// GET /auth/signup-status (§2.3, AUTH-03) — pending·rejected 토큰으로 호출 가능.
// §1.4 게이트 4개 허용 경로 중 하나라 403 AUTH_PENDING 이 나지 않는다.
export const getSignupStatus = async (): Promise<SignupStatusResponseTypes> => {
  const response = await apiFetch<{
    status: SignupStatusResponseTypes["status"];
    academy: SignupStatusResponseTypes["academy"];
    requested_at: string;
    reject_reason?: string;
    academy_contact: string | null;
  }>("/auth/signup-status", { method: "GET" });
  return {
    status: response.status,
    academy: response.academy,
    requestedAt: response.requested_at,
    rejectReason: response.reject_reason,
    academyContact: response.academy_contact,
  };
};
