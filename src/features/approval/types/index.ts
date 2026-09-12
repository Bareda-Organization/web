// features/approval 이 다루는 타입 전부 — 가입 승인(§5.1·§5.2) + 구간 변경 승인(§5.5·§5.6).
// snake_case ↔ camelCase 변환은 run/types 와 같은 관례로 api/*.ts 호출부 경계에서 한 번만 한다.
//
// ⚠ §5.5 사양 문면의 예시 JSON 은 approval_id·run_id 를 "apv_771"·"run_2026..." 같은
// 문자열로 보이지만, 실제 백엔드(2026-09-12 curl 확인)는 이 앱의 다른 모든 id 와 같이
// 숫자를 준다 — 예시가 대표값이 아니라 문서 오기로 판단해 숫자로 구현한다.

// §5.1 GET /staff/signup-requests — role=staff 는 관리자(§6.5) 몫이라 여기 나오지 않는다.
export type SignupRole = "parent" | "student" | "driver" | "escort";

export type SignupRequestItemResponseTypes = {
  requestId: number;
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
    studentIds?: number[];
    managerId?: number;
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
  approvalId: number;
  source: ChangeApprovalSource;
  studentName: string;
  runId: number;
  busNo: string;
  direction: "to_academy" | "from_academy";
  deadlineAt: string;
  stopName: string;
  remainingRiders: number;
  willRemoveStop: boolean;
  requestedAt: string;
};

export type ChangeApprovalsResponseTypes = {
  items: ChangeApprovalSummaryResponseTypes[];
  pendingCount: number;
};

// §5.5 GET /staff/approvals/{id} (상세) — 조회 시점에 재최적화를 정확히 1회 돌린다.
export type RouteStopPreviewResponseTypes = {
  seq: number;
  stopName: string;
  eta: string;
};

export type RoutePreviewResponseTypes = {
  stopsBefore: RouteStopPreviewResponseTypes[];
  stopsAfter: RouteStopPreviewResponseTypes[];
  reordered: string[];
  removed: string[];
};

export type ChangeApprovalAffectedStudentResponseTypes = {
  studentId: number;
  name: string;
};

export type ChangeApprovalDetailResponseTypes = ChangeApprovalSummaryResponseTypes & {
  routePreview: RoutePreviewResponseTypes;
  estTimeBefore: string;
  estTimeAfter: string;
  estDistanceBefore: number;
  estDistanceAfter: number;
  affectedStudents: ChangeApprovalAffectedStudentResponseTypes[];
  capacity: {
    studentCapacity: number;
    assigned: number;
  };
  previewToken: string;
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
