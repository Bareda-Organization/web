import { apiFetch } from "@/shared/lib/http";
import type { MeResponseTypes } from "../types";

// GET /me (§2.10) — pending·rejected 포함 전 역할 허용. `POST /auth/refresh` 가
// 토큰 2개만 주기 때문에, 새로고침 뒤 role·status 를 다시 얻는 유일한 경로다
// (API_SPEC §2.10 "이 엔드포인트가 필요한 이유"). AuthSessionProvider 부트스트랩이 쓴다.
export const getMe = async (): Promise<MeResponseTypes> => {
  const response = await apiFetch<{
    account_id: string;
    login_id: string;
    name: string;
    phone: string;
    role: MeResponseTypes["role"];
    status: MeResponseTypes["status"];
    academy?: MeResponseTypes["academy"];
    student_id?: string;
    manager_id?: string;
    manager_role?: string;
    linked_student_count?: number;
    must_change_password: boolean;
  }>("/me", { method: "GET" });
  return {
    accountId: response.account_id,
    loginId: response.login_id,
    name: response.name,
    phone: response.phone,
    role: response.role,
    status: response.status,
    academy: response.academy,
    studentId: response.student_id,
    managerId: response.manager_id,
    managerRole: response.manager_role,
    linkedStudentCount: response.linked_student_count,
    mustChangePassword: response.must_change_password,
  };
};
