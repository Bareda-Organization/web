import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { StudentSearchItemTypes } from "../types";

type RawStudentSearchResponse = {
  items: { student_id: string | number; name: string; class_name: string | null }[];
};

// 한 번에 보여줄 후보 수 — 이름으로 좁혀 고르는 용도라 첫 페이지면 된다.
const SEARCH_PAGE_SIZE = 10;

// GET /staff/students?q= (§5.11) — 강제 승하차지 추가에서 기존 학생을 이름으로 찾는다(F01-07).
// 학생 목록 화면의 `getStudents` 와 같은 엔드포인트지만, 그 기능(student)의 공개 창구에는 조회 함수가 없어
// 이 화면이 쓰는 3개 필드만 경계에서 옮긴다.
export const searchStudents = async (q: string): Promise<StudentSearchItemTypes[]> => {
  const raw = await apiFetch<RawStudentSearchResponse>("/staff/students", {
    method: "GET",
    query: { page: 0, size: SEARCH_PAGE_SIZE, q },
  });
  return raw.items.map((item) => ({ studentId: asIdString(item.student_id), name: item.name, className: item.class_name }));
};
