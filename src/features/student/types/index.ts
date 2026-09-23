// features/student 가 다루는 타입 전부 — 학생 관리(§5.11, STU-01~08, A-10).
// snake_case ↔ camelCase 변환은 api/*.ts 호출부 경계에서 한 번만 한다.
//
// ⚠ 2026-09-12 curl 실측 — 목록 응답의 student_id 는 문자열("2")이다(다른 기능의
// id 는 전부 숫자). §5.11 자체는 목록 항목의 타입을 명시하지 않아 실측값을 따른다.

export type StudentGender = "male" | "female";

// GET /staff/students 목록 항목 — §5.11 "응답 items[]" 표에 적힌 필드만.
export type StudentListItemResponseTypes = {
  studentId: string;
  name: string;
  className: string | null;
  guardianPhone: string | null;
  guardianCount: number;
};

export type StudentListResponseTypes = {
  items: StudentListItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

// GET /staff/students/{id} 상세 — ⚠ 관계자가 입력하지 않는 두 값(보호자 연락처·
// 승하차 주소, §5.11)은 이 상세 응답이 자체 실측(2026-09-12)으로는 승하차 주소가
// 아예 안 실리고 guardian_phone 만 조회 전용으로 함께 온다.
export type StudentDetailResponseTypes = {
  studentId: string;
  name: string;
  studentPhone: string | null;
  photoUrl: string | null;
  gender: StudentGender | null;
  birthDate: string | null;
  grade: string | null;
  className: string | null;
  note: string | null;
  canGoAlone: boolean;
  // 연결된 보호자 전부(먼저 연결된 차례) — 관계자가 연락처를 고칠 수 있다(Ruling 326).
  guardians: StudentGuardianTypes[];
};

export type StudentGuardianTypes = { guardianId: string; name: string; phone: string };

// POST /staff/students · PATCH /staff/students/{id} 공용 요청 — multipart(§1.1 40행,
// 이 엔드포인트만 예외). photo 는 새로 고를 때만 채워지고, 없으면 기존 사진을 유지한다.
export type StudentUpsertRequestTypes = {
  name: string;
  studentPhone?: string;
  photo?: File | null;
  gender?: StudentGender;
  birthDate?: string;
  grade?: string;
  className?: string;
  note?: string;
  canGoAlone: boolean;
  // 고친 보호자 연락처만 싣는다(수정 전용). 연결되지 않은 보호자는 서버가 422 로 막는다.
  guardians?: { guardianId: string; phone: string }[];
};
