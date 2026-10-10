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
  // Ruling 815 — 서버가 아직 안 주면 grade null · 혼자 귀가 false · 학생 앱 미연결 · 주소 none.
  grade: string | null;
  canGoAlone: boolean;
  accountLinked: boolean;
  weeklyAddressStatus: WeeklyAddressStatus;
};

// §5.11 — none 등록 0건 · partial 등록한 요일 중 한 방향만 있는 요일이 있음 · complete 등록한 요일마다 두 방향이 다 있음.
export type WeeklyAddressStatus = "none" | "partial" | "complete";

// Ruling 815 — 쿼리와 쪽에 무관한 학원 전체 값. 서버가 아직 안 주면 null.
export type StudentListSummaryTypes = {
  total: number;
  classCount: number;
  guardianUnlinked: number;
  addressMissing: number;
  canGoAlone: number;
};

// 목록 필터 — guardian_unlinked 보호자 미연결 · address_missing 주소 미등록.
export type StudentListFilter = "guardian_unlinked" | "address_missing";

export type StudentListQueryTypes = { q?: string; className?: string; filter?: StudentListFilter };

// GET /staff/students/{id}/withdrawal-preview (Ruling 815) — 그 학생이 탑승자인 오늘 · 내일 미취소 · 미종료 회차.
export type WithdrawalPreviewRunTypes = {
  runId: string;
  busNo: string;
  direction: "to_academy" | "from_academy";
  departTime: string;
  status: string;
  stopName: string | null;
};
export type WithdrawalPreviewResponseTypes = { todayRuns: WithdrawalPreviewRunTypes[]; tomorrowRuns: WithdrawalPreviewRunTypes[] };

export type StudentListResponseTypes = {
  summary?: StudentListSummaryTypes | null;
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
  // 학생 본인 계정 — 가입 연결 전이면 null. 관리자 경유 비밀번호 초기화(§5.22 · Ruling 329)의 대상.
  accountId: string | null;
};

// accountId 는 보호자 계정 — 관리자 경유 비밀번호 초기화(§5.22)의 대상.
export type StudentGuardianTypes = { guardianId: string; name: string; phone: string; accountId: string };

// POST /staff/students · PATCH /staff/students/{id} 공용 요청 — multipart(§1.1 40행,
// 이 엔드포인트만 예외). photo 는 새로 고를 때만 채워지고, 없으면 기존 사진을 유지한다.
export type StudentUpsertRequestTypes = {
  name: string;
  // 선택 항목: 키 없음(undefined) = 유지, `null` = 지움(수정 전용, Ruling 390).
  studentPhone?: string | null;
  photo?: File | null;
  gender?: StudentGender | null;
  birthDate?: string | null;
  grade?: string | null;
  className?: string | null;
  note?: string | null;
  canGoAlone: boolean;
  // 고친 보호자 연락처만 싣는다(수정 전용). 연결되지 않은 보호자는 서버가 422 로 막는다.
  guardians?: { guardianId: string; phone: string }[];
};

// GET /staff/students/{id}/weekly-address(STU-06 · Ruling 498) — 학부모가 등록한 요일 × 방향 주소. 관계자는 읽기만 한다.
// 좌표·승하차지 id 는 화면이 쓰지 않아 옮기지 않는다(L3 를 필요한 만큼만 다룬다).
export type StudentWeeklyAddressTypes = {
  weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  direction: "to_academy" | "from_academy";
  address: string;
  addressDetail: string | null;
  verified: boolean;
};

