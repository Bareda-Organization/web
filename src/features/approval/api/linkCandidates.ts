import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { LinkCandidateTypes, SignupRole } from "../types";

const CANDIDATE_PAGE_SIZE = 20;

type RawStudentList = { items: { student_id: string | number; name: string; class_name: string | null }[] };
type RawManagerList = {
  items: { id: string | number; name: string; phone: string; role: SignupRole; account_id: string | number | null }[];
};

// GET /staff/students?q= (§5.11, STU-01) — 가입 승인의 학생 연결 후보. 학생 관리 화면과 같은 엔드포인트라
// 새 API 가 아니고, 기능끼리 import 하지 않는 규칙 때문에 이 기능 안에 읽기 전용 조회만 따로 둔다(run/api/managers.ts 와 같은 방식).
export const searchStudentCandidates = async (q?: string): Promise<LinkCandidateTypes[]> => {
  const raw = await apiFetch<RawStudentList>("/staff/students", {
    method: "GET",
    query: { page: 0, size: CANDIDATE_PAGE_SIZE, q: q || undefined },
  });
  return raw.items.map((s) => ({ id: asIdString(s.student_id), name: s.name, detail: s.class_name ?? undefined }));
};

// GET /staff/managers?q= (§5.13, MGR-01) — 기사·동승자 승인의 매니저 연결 후보. 신청한 역할과 같고 아직 다른 계정에
// 연결되지 않은 매니저만 남긴다(이미 연결된 레코드를 고르면 서버가 연결 충돌로 거절한다).
export const searchManagerCandidates = async (role: SignupRole, q?: string): Promise<LinkCandidateTypes[]> => {
  const raw = await apiFetch<RawManagerList>("/staff/managers", {
    method: "GET",
    query: { page: 0, size: CANDIDATE_PAGE_SIZE, q: q || undefined },
  });
  return raw.items
    .filter((m) => m.role === role && m.account_id == null)
    .map((m) => ({ id: asIdString(m.id), name: m.name, detail: m.phone }));
};
