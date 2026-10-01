import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { LinkCandidateTypes, SignupRole } from "../types";

const CANDIDATE_PAGE_SIZE = 20;

type RawStudentList = {
  items: {
    student_id: string | number;
    name: string;
    class_name: string | null;
    guardian_phone?: string | null;
    account_linked?: boolean;
  }[];
};
type RawManagerList = {
  items: { id: string | number; name: string; phone: string }[];
};

// GET /staff/students?q= (§5.11, STU-01) — 가입 승인의 학생 연결 후보. 학생 관리 화면과 같은 엔드포인트라
// 새 API 가 아니고, 기능끼리 import 하지 않는 규칙 때문에 이 기능 안에 읽기 전용 조회만 따로 둔다(run/api/managers.ts 와 같은 방식).
export const searchStudentCandidates = async (q?: string): Promise<LinkCandidateTypes[]> => {
  const raw = await apiFetch<RawStudentList>("/staff/students", {
    method: "GET",
    query: { page: 0, size: CANDIDATE_PAGE_SIZE, q: q || undefined },
  });
  // 동명이인은 반이 같을 수 있어 보호자 연락처(서버가 목록에 주는 값)로 가른다 — B1 #14.
  return raw.items.map((s) => ({
    id: asIdString(s.student_id),
    name: s.name,
    detail: [s.class_name, s.guardian_phone ? `보호자 ${s.guardian_phone}` : "보호자 미연결"].filter(Boolean).join(" · "),
    // 학생 본인 계정이 이미 연결된 학생은 승인 확정 때 409 ALREADY_LINKED 로 거절되므로 미리 고를 수 없게 한다.
    ...(s.account_linked ? { disabledReason: "이미 가입한 학생" } : {}),
  }));
};

// GET /staff/managers?q=&role=&linked=false (§5.13, MGR-01 · Ruling 391) — 기사·동승자 승인의 매니저 연결 후보.
// 신청한 역할과 같고 아직 계정에 연결되지 않은 매니저만 서버가 걸러 준다(이미 연결된 레코드를 고르면 연결 충돌로 거절된다).
// ponytail: 한 쪽(100건)만 받는다 — 미연결 기사·동승자가 100명을 넘으면 검색어(q)로 좁힌다.
const MANAGER_CANDIDATE_SIZE = 100;

export const searchManagerCandidates = async (role: SignupRole, q?: string): Promise<LinkCandidateTypes[]> => {
  const raw = await apiFetch<RawManagerList>("/staff/managers", {
    method: "GET",
    query: { page: 0, size: MANAGER_CANDIDATE_SIZE, q: q || undefined, role, linked: false },
  });
  return raw.items.map((m) => ({ id: asIdString(m.id), name: m.name, detail: m.phone }));
};
