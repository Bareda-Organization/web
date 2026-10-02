// features/admin 이 다루는 타입 전부 — API_SPEC §6 전체(8 화면). snake_case ↔ camelCase
// 변환은 다른 기능과 같은 관례로 api/*.ts 호출부 경계에서 한 번만 한다.
// 메인 관리자는 학원 경계를 넘는 유일한 역할이라(BRIEF-a1.md §2) 목록 타입마다
// 소속 학원을 드러내는 필드를 둔다 — 관계자 화면 타입을 그대로 복사하면 이 축이 빠진다.

// ── §6.1~§6.3 학원 목록 · 등록 · 수정 (O-01) ──────────────────────────────
export type AcademyStatus = "active" | "inactive";

export type AcademySummaryResponseTypes = {
  id: string;
  code: string;
  name: string;
  region: string;
  staffCount: number;
  userCount: number;
  status: AcademyStatus;
};

export type AcademiesResponseTypes = {
  items: AcademySummaryResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

export type AcademyStaffAccountRefResponseTypes = {
  accountId: string;
  name: string;
  loginId: string;
};

export type AcademyDetailResponseTypes = AcademySummaryResponseTypes & {
  address: string | null;
  contact: string | null;
  memo: string | null;
  staffAccounts: AcademyStaffAccountRefResponseTypes[];
  stats: { movingBusCount: number };
};

// §6.2 POST /admin/academies. code 는 서버 생성값이라 요청에 없다. address 는 필수(Ruling 450).
export type CreateAcademyRequestTypes = {
  name: string;
  region: string;
  address: string;
  contact?: string;
  memo?: string;
};

export type CreateAcademyResponseTypes = {
  academyId: string;
  code: string;
  name: string;
  region: string;
  warnings: string[];
};

// §6.3 PATCH /admin/academies/{id}. code 는 수정 대상 밖.
export type UpdateAcademyRequestTypes = {
  name?: string;
  region?: string;
  address?: string;
  contact?: string;
  memo?: string;
  status?: AcademyStatus;
};

// ── §6.4~§6.5 관계자 가입 승인 (O-02) ─────────────────────────────────────
export type StaffSignupAcademyRefResponseTypes = {
  id: string;
  code: string;
  name: string;
  region: string;
};

export type StaffSignupRequestItemResponseTypes = {
  requestId: string;
  name: string;
  phone: string;
  academy: StaffSignupAcademyRefResponseTypes;
  requestedAt: string;
  academyStaffCount: number;
};

export type StaffSignupRequestsResponseTypes = {
  items: StaffSignupRequestItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

export type StaffSignupDecideRequestTypes = {
  accept: boolean;
  rejectReason?: string;
};

export type StaffSignupAccountStatus = "active" | "rejected";

export type StaffSignupDecideResponseTypes = {
  accountStatus: StaffSignupAccountStatus;
  decidedAt: string;
};

// ── §6.6~§6.7 관계자 계정 관리 (O-02) ─────────────────────────────────────
export type StaffAccountStatus = "active" | "inactive";

export type StaffAccountItemResponseTypes = {
  accountId: string;
  name: string;
  loginId: string;
  phone: string;
  academyName: string;
  lastLoginAt: string | null;
  status: StaffAccountStatus;
};

export type StaffAccountsResponseTypes = {
  items: StaffAccountItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

// §6.7 PATCH /admin/staff-accounts/{id}. 세 동작(정보 수정 · 비밀번호 초기화 · 재직 상태)이
// 한 요청에 섞일 수 있으나, 화면은 명확성을 위해 한 번에 하나만 보낸다(판단 근거, 보고서 §1).
export type UpdateStaffAccountRequestTypes = {
  name?: string;
  phone?: string;
  email?: string;
  resetPassword?: boolean;
  status?: StaffAccountStatus;
};

export type UpdateStaffAccountResponseTypes = {
  accountId: string;
  temporaryPassword?: string;
};

// ── §6.8~§6.9 전체 관제 (O-05 · O-06) ─────────────────────────────────────
export type RunStatus = "idle" | "confirmed" | "moving" | "finished";

export type LivePositionResponseTypes = {
  lat: number;
  lng: number;
  receivedAt: string;
} | null;

export type LiveStopResponseTypes = {
  stopId: string;
  seq: number;
  name: string;
  lat: number;
  lng: number;
  change: string | null;
  arrivedAt: string | null;
  eta: string | null;
};

export type LiveContactResponseTypes = {
  name: string;
  phone: string;
};

export type RunLiveItemResponseTypes = {
  runId: string;
  busNo: string;
  direction: "to_academy" | "from_academy";
  runStatus: RunStatus;
  position: LivePositionResponseTypes;
  lastSeenAt: string | null;
  departTime: string;
  // 확정 판정 시각(출발 30분 전, run.confirm_at 저장값 — §6.8, Ruling 393). 강제 확정 표의 "확정 예정".
  confirmAt: string;
  estDepartTime: string;
  stops: LiveStopResponseTypes[];
  destinationEta: string | null;
  // 배치 전(idle·confirmed) 회차는 기사·동승자가 부재다 — R16, Ruling 315.
  driver: LiveContactResponseTypes | null;
  escort: LiveContactResponseTypes | null;
  // W4 — 확정 배치의 연속 실패 횟수, 성공 시 0(`API_SPEC §6.8`).
  consecutiveFailures: number;
};

export type AcademyRunsLiveResponseTypes = {
  runs: RunLiveItemResponseTypes[];
};

// §6.9 승하차지별 학생 리스트 — stops[] → students[] 중첩 (2026-09-12 curl 로 실제
// 응답 형태 확인, 문서 그대로였다 — run/roster.ts 의 배열-직접-반환 편차와 다르다).
export type RosterBoardStatus = "boarded" | "alighted" | "absent" | "no_show" | "waiting";

export type RosterStudentResponseTypes = {
  studentId: string;
  name: string;
  photoUrl: string | null;
  studentPhone: string | null;
  // 보호자 미연결 학생은 null(§1.13 목록, Ruling 359) — §4.2·§5.4 와 같은 근거.
  guardianPhone: string | null;
  status: RosterBoardStatus;
};

export type RosterStopResponseTypes = {
  stopId: string;
  seq: number;
  name: string;
  students: RosterStudentResponseTypes[];
};

export type RunRosterResponseTypes = {
  stops: RosterStopResponseTypes[];
};

// ── §6.10 · §6.12 차단 계정 해제 (O-03) ───────────────────────────────────
// §9.1 전체 6종 — 차단은 역할 무관하게 걸릴 수 있다.
export type AccountRole = "parent" | "student" | "driver" | "escort" | "staff" | "system_admin";

export type BlockedAccountItemResponseTypes = {
  accountId: string;
  loginId: string;
  name: string;
  academyName: string;
  blockedAt: string;
  failedAttempts: number;
  reason: string;
  // W6 — §9.1 역할(`Ruling 328`).
  role: AccountRole;
  // W6 — 차단 직전 계정 상태. 해제하면 이 값으로 되돌아간다(§6.12 · `Ruling 328`).
  statusBeforeBlock: "active" | "pending" | "rejected";
};

export type BlockedAccountsResponseTypes = {
  items: BlockedAccountItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

export type UnblockAccountResponseTypes = {
  accountStatus: "active";
  unblockedBy: string;
  unblockedAt: string;
};

// ── §6.11 비상 알림 이력 (O-07) ───────────────────────────────────────────
// A1 수정 라운드(조건 ③) — 이전 값(VEHICLE_FAULT · MEDICAL · ACCIDENT · OTHER)은 정본과
// 대조하지 않고 적어 둔 것이었다. API_SPEC §5.16·§2306 이 정의하는 값은 소문자 스네이크
// 케이스 4종(accident · vehicle_fault · student_emergency · etc)이다. 당시 백엔드가
// 대문자 Java enum 이름을 그대로 내려 정본과 어긋나 있던 것은 서버 직렬화 정정(BE-R1
// 목표 3)으로 해소돼, 대소문자 흡수용 `(string & {})` 를 걷어냈다.
export type EmergencyType = "accident" | "vehicle_fault" | "student_emergency" | "etc";

export type EmergencyAcademyRefResponseTypes = {
  id: string;
  name: string;
  contact: string;
};

export type EmergencyPersonResponseTypes = {
  name: string | null;
  role: string;
  phone: string | null;
};

export type EmergencyPositionResponseTypes = {
  lat: number;
  lng: number;
  recordedAt: string | null;
} | null;

// 실제 응답(2026-09-12 curl 재확인)은 최상위가 §5.16 문서의 `items` 가 아니라
// `emergencies` 다 — 이 부분은 정본과 실제로 어긋난다. 반대로 `unacked_count` 는
// 문서에 없는 것이 아니라 §5.16 이 이미 명시한 필드다(이전 코멘트의 오기, A1 수정
// 라운드에서 §5.16 을 직접 대조해 정정) — 목록 헤더에 "미확인 N건" 으로 쓴다.
export type EmergencyItemResponseTypes = {
  emergencyId: string;
  academy: EmergencyAcademyRefResponseTypes;
  type: EmergencyType;
  memo: string | null;
  raisedBy: EmergencyPersonResponseTypes;
  runId: string;
  busNo: string;
  direction: "to_academy" | "from_academy";
  position: EmergencyPositionResponseTypes;
  riderCount: number;
  contacts: EmergencyPersonResponseTypes[];
  raisedAt: string;
  staffAcked: boolean;
  ackedAt: string | null;
  canceledAt: string | null;
  // 서버는 `{name, memo}` 객체를 준다(§6.11) — memo 는 확인할 때 남긴 조치 메모(Ruling 541).
  ackedBy: { name: string; memo: string | null } | null;
  elapsedSinceRaised: number;
};

// §6.15 — 학원 1곳의 오늘 지연·확정 실패 회차 수. 둘 중 하나는 반드시 0 보다 크다.
export type RunAttentionItemTypes = { academyId: string; delayedRuns: number; confirmFailedRuns: number };

export type RunAttentionResponseTypes = { items: RunAttentionItemTypes[] };

export type EmergenciesResponseTypes = {
  items: EmergencyItemResponseTypes[];
  unackedCount: number;
};

// ── §6.13 감사 · 접속 이력 (O-04) ─────────────────────────────────────────
export type AuditAction = "read" | "update" | "delete";

export type AuditLogItemResponseTypes = {
  actor: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  academyName: string | null;
  occurredAt: string;
};

export type AuditLogsResponseTypes = {
  items: AuditLogItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

export type LoginHistoryResult = "success" | "fail";

// block_event 행이 차단인지 해제인지(Ruling 394). block_event 가 아닌 행은 null.
export type LoginHistoryBlockAction = "block" | "unblock";

export type LoginHistoryItemResponseTypes = {
  accountId: string;
  loginId: string;
  // 차단·해제 행은 로그인 결과 축이 아니라 null(§6.13).
  result: LoginHistoryResult | null;
  ip: string;
  occurredAt: string;
  blockEvent: boolean;
  blockAction: LoginHistoryBlockAction | null;
};

export type LoginHistoryResponseTypes = {
  items: LoginHistoryItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

// 감사·접속 이력 목록 조회 시 공통으로 쓰는 필터 (§6.13 쿼리 파라미터).
// §1.8 페이징 요청 — page 는 0 기점, size 는 기본 20·최대 100.
export type PagingRequest = { page?: number; size?: number };

export type AuditQueryTypes = PagingRequest & {
  academyId?: string;
  accountId?: string;
  from?: string;
  to?: string;
  /** 감사 로그 탭만 쓴다 — 접속 이력은 동작을 고르지 않는다(Ruling 446). */
  action?: AuditAction;
};

// GET /admin/audit-actors (§6.13, Ruling 447) — 계정 ID 를 손으로 치지 않고 이름·아이디 일부로 고르는 목록.
export type AuditActorResponseTypes = {
  accountId: string;
  name: string;
  loginId: string;
  role: string;
  academyName: string | null;
};

// ── §6.14 회차 강제 확정 (O-06) — 되돌릴 수 없다 ──────────────────────────
export type ForceConfirmRequestTypes = {
  reason: string;
};

export type ForceConfirmResponseTypes = {
  runId: string;
  routeVersionId: string;
  fallbackUsed: true;
  confirmedAt: string;
};

// ── §6.16·§6.17 끝나지 않은 이동 중 회차 목록·강제 종료 (Ruling 724) — 되돌릴 수 없다 ──
export type StaleMovingRunItemResponseTypes = {
  runId: string;
  academyId: string;
  academyName: string;
  serviceDate: string;
  direction: "to_academy" | "from_academy";
  busNo: string;
  startedAt: string | null;
  finishPending: boolean;
  // 아직 `boarded` 인 탑승자 수 — 강제 종료하면 하차 처리 없이 남겨지는 인원이다.
  boardedCount: number;
};

export type StaleMovingRunListResponseTypes = {
  items: StaleMovingRunItemResponseTypes[];
};

export type ForceFinishResponseTypes = {
  runId: string;
  finishedAt: string;
  boardedCount: number;
};
