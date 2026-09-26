// features/approval 이 다루는 타입 전부 — 가입 승인(§5.1·§5.2) + 구간 변경 승인(§5.5·§5.6).
// snake_case ↔ camelCase 변환은 run/types 와 같은 관례로 api/*.ts 호출부 경계에서 한 번만 한다.
//
// ⚠ §5.5 사양 문면의 예시 JSON 은 approval_id·run_id 를 "apv_771"·"run_2026..." 같은
// 문자열로 보이지만, 실제 백엔드(2026-09-12 curl 확인)는 이 앱의 다른 모든 id 와 같이
// 숫자를 준다 — 예시가 대표값이 아니라 문서 오기로 판단해 숫자로 구현한다.

// §5.1 GET /staff/signup-requests — role=staff 는 관리자(§6.5) 몫이라 여기 나오지 않는다.
export type SignupRole = "parent" | "student" | "driver" | "escort";

export type SignupRequestItemResponseTypes = {
  requestId: string;
  name: string;
  role: SignupRole;
  phone: string;
  requestedAt: string;
};

export type SignupRequestsResponseTypes = {
  items: SignupRequestItemResponseTypes[];
  pendingCount: number;
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

// §5.2 POST /staff/signup-requests/{id}/decide.
// link.studentIds 는 role=parent|student 승인 시, link.managerId 는 role=driver|escort 승인 시 필수.
export type SignupDecideRequestTypes = {
  accept: boolean;
  rejectReason?: string;
  link?: {
    studentIds?: string[];
    managerId?: string;
  };
};

export type SignupAccountStatus = "active" | "rejected";

export type SignupDecideResponseTypes = {
  accountStatus: SignupAccountStatus;
  decidedAt: string;
};

// §5.5 GET /staff/approvals (목록) — 목록은 재계산 없는 요약이라 필드가 얕다.
export type ChangeApprovalSource = "intent" | "change_request";

export type ChangeApprovalSummaryResponseTypes = {
  approvalId: string;
  source: ChangeApprovalSource;
  studentName: string;
  runId: string;
  busNo: string;
  direction: "to_academy" | "from_academy";
  deadlineAt: string;
  stopName: string;
  remainingRiders: number;
  willRemoveStop: boolean;
  requestedAt: string;
};

// §1.8 페이징 봉투 + pending_count(Ruling 358) — 선례 NotificationListResponseTypes 와 같은 모양.
export type ChangeApprovalsResponseTypes = {
  items: ChangeApprovalSummaryResponseTypes[];
  pendingCount: number;
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

// §5.5 GET /staff/approvals/{id} (상세) — 조회 시점에 재최적화를 정확히 1회 돌린다.
// R21-A 추가 지시 ② — lat·lng 를 더했다(지도 마커용). 경유 지점만 가리키는 항목은
// 좌표를 안 실어 null 이다 — 그 마커만 건너뛴다(백엔드 코멘트와 같은 근거).
export type RouteStopPreviewResponseTypes = {
  seq: number;
  stopName: string;
  eta: string;
  lat: number | null;
  lng: number | null;
};

// 지도에 그릴 도로 좌표 한 점(`R18-C` 목표 4, Ruling 319) — `features/map` 의 `MapPolyline.points`
// 와 같은 모양이라 변환 없이 그대로 넘길 수 있다.
export type RoutePathPointResponseTypes = {
  lat: number;
  lng: number;
};

// R21-A 추가 지시 ② 이전엔 `reordered`·`removed` 가 문자열 배열로 선언돼 있었으나(타입 오기),
// 실제 백엔드는 처음부터 객체(`stop_id`·`stop_name`)를 줬다 — 지금까지 이 필드를 화면에서
// 쓴 적이 없어 드러나지 않았다. lat·lng 를 더하며 실제 모양대로 바로잡는다.
export type RouteStopRefResponseTypes = {
  stopId: string;
  stopName: string | null;
  lat: number | null;
  lng: number | null;
};

export type RoutePreviewResponseTypes = {
  stopsBefore: RouteStopPreviewResponseTypes[];
  stopsAfter: RouteStopPreviewResponseTypes[];
  reordered: RouteStopRefResponseTypes[];
  removed: RouteStopRefResponseTypes[];
  // `R18-C` 목표 4(Ruling 319) — 좌우 두 지도로 나란히 그릴 전/후 도로 좌표. 결정된 건이거나
  // 옛 확정 노선 버전(도로 좌표 컬럼 도입 전)이면 빈 배열이다 — null 이 아니다.
  roadPathBefore: RoutePathPointResponseTypes[];
  roadPathAfter: RoutePathPointResponseTypes[];
};

export type ChangeApprovalAffectedStudentResponseTypes = {
  studentId: string;
  name: string;
};

// ⚠ 재최적화 전용 필드 8개(`R18-C` 에서 est_duration_before·est_duration_after 2개 추가)는
// 전부 null 일 수 있다 — 이미 결정된 건(approved·rejected·auto_rejected)의 상세 조회는
// 재최적화를 하지 않는다(백엔드
// `StaffApprovalControllerTest#결정된_건의_상세_조회는_재최적화를_실행하지_않는다`,
// 2026-09-14 F5-W1 실서버 계약 시험(approval_id=2, approved)에서도 그대로 재현 —
// 이 널 처리가 없어 `TypeError: Cannot read properties of null (reading 'stops_before')`
// 로 죽던 결함을 그 시험이 잡았다). `affectedStudents` 는 이 경우에도 빈 배열이라 null 이 아니다.
export type ChangeApprovalDetailResponseTypes = ChangeApprovalSummaryResponseTypes & {
  routePreview: RoutePreviewResponseTypes | null;
  // `R20-B` 목표 3(조율자 결정) — 회차 출발 예정 시각. 변경 전/후로 갈리지 않는다(재최적화가
  // 출발 시각 자체를 옮기지 않는다). `r20-a` 가 이 필드를 추가하기 전에는 백엔드가 아예
  // 내려주지 않으므로 `undefined` 를 `null` 로 흡수한다(api/changeApprovals.ts) — 값이
  // 없으면 견디는 화면을 만든다는 목표 5 와 같은 이유다.
  departTime: string | null;
  estTimeBefore: string | null;
  estTimeAfter: string | null;
  estDistanceBefore: number | null;
  estDistanceAfter: number | null;
  // 노선 전체 소요(분, Ruling 318) — 출발지→마지막 정차지. 특정 학생의 승하차지까지가 아니다.
  estDurationBefore: number | null;
  estDurationAfter: number | null;
  affectedStudents: ChangeApprovalAffectedStudentResponseTypes[];
  capacity: {
    studentCapacity: number;
    assigned: number;
  };
  previewToken: string | null;
  previewStale: boolean;
};

// §5.6 POST /staff/approvals/{id}/decide.
// previewToken 은 approve=true 일 때 필수 — 상세 조회 시 본 재최적화와 실제 반영본이 같음을 보장한다.
// 불일치·만료면 409 PREVIEW_STALE.
export type ChangeApprovalDecideRequestTypes = {
  approve: boolean;
  rejectReason?: string;
  previewToken?: string;
};

export type ChangeApprovalDecideStatus = "approved" | "rejected" | "auto_rejected";

export type ChangeApprovalDecideResponseTypes = {
  status: ChangeApprovalDecideStatus;
  stopRemoved: boolean;
  routeVersion: number;
  decidedBy: string;
  decidedAt: string;
};
