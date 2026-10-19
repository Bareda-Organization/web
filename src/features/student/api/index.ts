import { apiFetch, apiFetchMultipart } from "@/shared/lib/http";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  StudentDetailResponseTypes,
  StudentListItemResponseTypes,
  StudentListQueryTypes,
  StudentListResponseTypes,
  StudentUpsertRequestTypes,
  WithdrawalPreviewResponseTypes,
  WithdrawalPreviewRunTypes,
  StudentWeeklyAddressTypes,
} from "../types";

// Ruling 815 — 서버가 아직 안 주는 칸은 기본값으로 채운다.
type WireStudentListItem = Omit<StudentListItemResponseTypes, "grade" | "canGoAlone" | "accountLinked" | "weeklyAddressStatus"> &
  Partial<Pick<StudentListItemResponseTypes, "grade" | "canGoAlone" | "accountLinked" | "weeklyAddressStatus">>;

const toListItem = (raw: WireStudentListItem): StudentListItemResponseTypes => ({
  ...raw,
  grade: raw.grade ?? null,
  canGoAlone: raw.canGoAlone ?? false,
  accountLinked: raw.accountLinked ?? false,
  weeklyAddressStatus: raw.weeklyAddressStatus ?? "none",
});

// GET /staff/students?q= (§5.11, STU-01) — §1.8 페이징. 강제 추가 자동완성과 목록 조회가 같은 엔드포인트를 쓴다.
// Ruling 815 — `class_name` · `filter` 쿼리와 응답 최상위 `summary`(학원 전체 지표, 쿼리·쪽과 무관).
export const getStudents = async (
  page: number,
  size = 20,
  q?: string,
  filters: Omit<StudentListQueryTypes, "q"> = {},
): Promise<StudentListResponseTypes> => {
  const raw = await apiFetch<Omit<StudentListResponseTypes, "items"> & { items: WireStudentListItem[] }>("/staff/students", {
    method: "GET",
    query: { page, size, q: q || undefined, class_name: filters.className || undefined, filter: filters.filter },
  });
  return { ...raw, summary: raw.summary ?? null, items: raw.items.map(toListItem) };
};

// GET /staff/students/{id} (§5.11, STU-01) — 404 STUDENT_NOT_FOUND 는 미존재·타 학원
// 양쪽 다 같은 코드로 온다(§2 판단 근거 — 존재 비노출, Ruling 163).
export const getStudentDetail = async (studentId: string): Promise<StudentDetailResponseTypes> => {
  return apiFetch<StudentDetailResponseTypes>(`/staff/students/${studentId}`, { method: "GET" });
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
  return apiFetchMultipart<StudentDetailResponseTypes>("/staff/students", {
    method: "POST",
    data: toFields(request),
    file: request.photo ? { field: "photo", value: request.photo } : undefined,
  });
};

// PATCH /staff/students/{id} (STU-03) — 주소는 대상 밖, 보호자 연락처는 고칠 수 있다(Ruling 326). photo 를
// 새로 고르지 않으면 file 파트를 아예 보내지 않아 기존 사진을 유지한다.
export const updateStudent = async (
  studentId: string,
  request: StudentUpsertRequestTypes,
): Promise<StudentDetailResponseTypes> => {
  return apiFetchMultipart<StudentDetailResponseTypes>(`/staff/students/${studentId}`, {
    method: "PATCH",
    data: toFields(request),
    file: request.photo ? { field: "photo", value: request.photo } : undefined,
  });
};

// DELETE /staff/students/{id}/photo (STU-03 · Ruling 894③) — 저장 파일과 photo_url 을 함께 지운다. 204, 사진이 이미 없어도 204(멱등).
export const deleteStudentPhoto = async (studentId: string): Promise<void> => {
  await apiFetch<void>(`/staff/students/${studentId}/photo`, { method: "DELETE" });
};

// DELETE /staff/students/{id} (STU-04) — 퇴원 soft delete. 오늘 명단은 유지, 내일부터 제외.
export const deleteStudent = async (studentId: string): Promise<void> => {
  await apiFetch<void>(`/staff/students/${studentId}`, { method: "DELETE" });
};

// GET /staff/students/{id}/weekly-address(STU-06 · Ruling 498) — 주소는 L3 라 서버가 조회마다 감사 기록을 남긴다. 관계자는 읽기만 한다.
export const getStudentWeeklyAddresses = async (studentId: string): Promise<StudentWeeklyAddressTypes[]> => {
  const raw = await apiFetch<{ entries: StudentWeeklyAddressTypes[] }>(`/staff/students/${studentId}/weekly-address`, { method: "GET" });
  // 서버가 함께 보내는 좌표 · 승하차지 id 는 화면이 쓰지 않아 옮기지 않는다.
  return raw.entries.map(({ weekday, direction, address, addressDetail, verified }) => ({ weekday, direction, address, addressDetail, verified }));
};

// 서버 run_id 는 숫자 — 화면 타입은 문자열.
type WirePreviewRun = WithId<WithdrawalPreviewRunTypes, "runId">;
const toPreviewRun = (raw: WirePreviewRun): WithdrawalPreviewRunTypes => ({ ...raw, runId: String(raw.runId) });

// GET /staff/students/{id}/withdrawal-preview(Ruling 815) — 퇴원하면 오늘 명단은 유지되고 내일부터 빠지는 회차. 아무것도 바꾸지 않는다.
export const getWithdrawalPreview = async (studentId: string): Promise<WithdrawalPreviewResponseTypes> => {
  const raw = await apiFetch<{ todayRuns?: WirePreviewRun[]; tomorrowRuns?: WirePreviewRun[] }>(`/staff/students/${studentId}/withdrawal-preview`, {
    method: "GET",
  });
  return { todayRuns: (raw.todayRuns ?? []).map(toPreviewRun), tomorrowRuns: (raw.tomorrowRuns ?? []).map(toPreviewRun) };
};
