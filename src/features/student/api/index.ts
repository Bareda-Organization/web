import { apiFetch, apiFetchMultipart } from "@/shared/lib/http";
import type {
  StudentDetailResponseTypes,
  StudentGender,
  StudentListItemResponseTypes,
  StudentListResponseTypes,
  StudentUpsertRequestTypes,
} from "../types";

type RawStudentListItem = {
  student_id: string;
  name: string;
  class_name: string | null;
  guardian_phone: string | null;
  guardian_count: number;
};

type RawStudentListResponse = {
  items: RawStudentListItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toListItem = (raw: RawStudentListItem): StudentListItemResponseTypes => ({
  studentId: raw.student_id,
  name: raw.name,
  className: raw.class_name,
  guardianPhone: raw.guardian_phone,
  guardianCount: raw.guardian_count,
});

// GET /staff/students?q= (§5.11, STU-01) — §1.8 페이징. 강제 추가 자동완성과 목록 조회가 같은 엔드포인트를 쓴다.
export const getStudents = async (page: number, size = 20, q?: string): Promise<StudentListResponseTypes> => {
  const raw = await apiFetch<RawStudentListResponse>("/staff/students", {
    method: "GET",
    query: { page, size, q: q || undefined },
  });
  return {
    items: raw.items.map(toListItem),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

type RawStudentDetail = {
  student_id: string;
  name: string;
  student_phone: string | null;
  photo_url: string | null;
  gender: StudentGender | null;
  birth_date: string | null;
  grade: string | null;
  class_name: string | null;
  note: string | null;
  can_go_alone: boolean;
  guardians: { guardian_id: string; name: string; phone: string; account_id: string }[];
  account_id: string | null;
};

const toDetail = (raw: RawStudentDetail): StudentDetailResponseTypes => ({
  studentId: raw.student_id,
  name: raw.name,
  studentPhone: raw.student_phone,
  photoUrl: raw.photo_url,
  gender: raw.gender,
  birthDate: raw.birth_date,
  grade: raw.grade,
  className: raw.class_name,
  note: raw.note,
  canGoAlone: raw.can_go_alone,
  guardians: raw.guardians.map((guardian) => ({
    guardianId: guardian.guardian_id,
    name: guardian.name,
    phone: guardian.phone,
    accountId: guardian.account_id,
  })),
  accountId: raw.account_id,
});

// GET /staff/students/{id} (§5.11, STU-01) — 404 STUDENT_NOT_FOUND 는 미존재·타 학원
// 양쪽 다 같은 코드로 온다(§2 판단 근거 — 존재 비노출, Ruling 163).
export const getStudentDetail = async (studentId: string): Promise<StudentDetailResponseTypes> => {
  const raw = await apiFetch<RawStudentDetail>(`/staff/students/${studentId}`, { method: "GET" });
  return toDetail(raw);
};

const toFields = (request: StudentUpsertRequestTypes) => ({
  name: request.name,
  student_phone: request.studentPhone,
  gender: request.gender,
  birth_date: request.birthDate,
  grade: request.grade,
  class_name: request.className,
  note: request.note,
  can_go_alone: request.canGoAlone,
  guardians: request.guardians?.map((guardian) => ({ guardian_id: guardian.guardianId, phone: guardian.phone })),
});

// POST /staff/students (STU-02) — multipart(§1.1 40행 유일 예외). 사진은 3종·5MB
// 제한을 PhotoUploadField 가 이미 걸러 낸 파일만 여기 들어온다.
export const createStudent = async (request: StudentUpsertRequestTypes): Promise<StudentDetailResponseTypes> => {
  const raw = await apiFetchMultipart<RawStudentDetail>("/staff/students", {
    method: "POST",
    data: toFields(request),
    file: request.photo ? { field: "photo", value: request.photo } : undefined,
  });
  return toDetail(raw);
};

// PATCH /staff/students/{id} (STU-03) — 주소는 대상 밖, 보호자 연락처는 고칠 수 있다(Ruling 326). photo 를
// 새로 고르지 않으면 file 파트를 아예 보내지 않아 기존 사진을 유지한다.
export const updateStudent = async (
  studentId: string,
  request: StudentUpsertRequestTypes,
): Promise<StudentDetailResponseTypes> => {
  const raw = await apiFetchMultipart<RawStudentDetail>(`/staff/students/${studentId}`, {
    method: "PATCH",
    data: toFields(request),
    file: request.photo ? { field: "photo", value: request.photo } : undefined,
  });
  return toDetail(raw);
};

// DELETE /staff/students/{id} (STU-04) — 퇴원 soft delete. 오늘 명단은 유지, 내일부터 제외.
export const deleteStudent = async (studentId: string): Promise<void> => {
  await apiFetch<void>(`/staff/students/${studentId}`, { method: "DELETE" });
};
