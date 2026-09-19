import { apiFetch } from "@/shared/lib/http";
import type {
  ChangeApprovalDecideRequestTypes,
  ChangeApprovalDecideResponseTypes,
  ChangeApprovalDetailResponseTypes,
  ChangeApprovalSource,
  ChangeApprovalSummaryResponseTypes,
  ChangeApprovalsResponseTypes,
  RouteStopPreviewResponseTypes,
} from "../types";

type RawChangeApprovalSummary = {
  approval_id: number;
  source: ChangeApprovalSource;
  student_name: string;
  run_id: number;
  bus_no: string;
  direction: "to_academy" | "from_academy";
  deadline_at: string;
  stop_name: string;
  remaining_riders: number;
  will_remove_stop: boolean;
  requested_at: string;
};

type RawChangeApprovalsResponse = {
  items: RawChangeApprovalSummary[];
  pending_count: number;
};

const toSummary = (raw: RawChangeApprovalSummary): ChangeApprovalSummaryResponseTypes => ({
  approvalId: raw.approval_id,
  source: raw.source,
  studentName: raw.student_name,
  runId: raw.run_id,
  busNo: raw.bus_no,
  direction: raw.direction,
  deadlineAt: raw.deadline_at,
  stopName: raw.stop_name,
  remainingRiders: raw.remaining_riders,
  willRemoveStop: raw.will_remove_stop,
  requestedAt: raw.requested_at,
});

// GET /staff/approvals (§5.5 목록, A-05) — 요약만 준다. `status` 기본값은 pending.
// rejected·auto_rejected 조회가 500 을 내던 결함은 병합 `ab51f8f` 로 해소됐다(Ruling 264,
// 2026-09-12 이 좌석이 8081 에서 재확인) — §9.6 4종을 전부 화면 필터로 연다.
export const getChangeApprovals = async (status?: string): Promise<ChangeApprovalsResponseTypes> => {
  const raw = await apiFetch<RawChangeApprovalsResponse>("/staff/approvals", {
    method: "GET",
    query: status ? { status } : undefined,
  });
  return { items: raw.items.map(toSummary), pendingCount: raw.pending_count };
};

type RawRouteStop = {
  seq: number;
  stop_name: string;
  eta: string;
};

const toRouteStop = (raw: RawRouteStop): RouteStopPreviewResponseTypes => ({
  seq: raw.seq,
  stopName: raw.stop_name,
  eta: raw.eta,
});

type RawRoutePathPoint = { lat: number; lng: number };

type RawChangeApprovalDetail = RawChangeApprovalSummary & {
  // `R20-B` 목표 3 — `r20-a` 가 아직 병합 전이라 백엔드가 이 키 자체를 안 줄 수 있다
  // (`undefined`). optional 로 받아 두고 아래에서 `null` 로 흡수한다.
  depart_time?: string | null;
  route_preview: {
    stops_before: RawRouteStop[];
    stops_after: RawRouteStop[];
    reordered: string[];
    removed: string[];
    road_path_before: RawRoutePathPoint[];
    road_path_after: RawRoutePathPoint[];
  } | null;
  est_time_before: string | null;
  est_time_after: string | null;
  est_distance_before: number | null;
  est_distance_after: number | null;
  est_duration_before: number | null;
  est_duration_after: number | null;
  affected_students: { student_id: number; name: string }[];
  capacity: { student_capacity: number; assigned: number };
  preview_token: string | null;
  preview_stale: boolean;
};

// GET /staff/approvals/{id} (§5.5 상세, A-05) — 대기 건은 조회 시점에 재최적화를 정확히
// 1회 실행하지만, 이미 결정된 건(approved·rejected·auto_rejected)은 재최적화를 하지 않고
// `route_preview`·`est_time_*`·`est_distance_*`·`preview_token` 을 전부 null 로 돌려준다
// (백엔드 `StaffApprovalControllerTest#결정된_건의_상세_조회는_재최적화를_실행하지_않는다`).
// 이 null 을 그대로 뚫고 지나가 `stops_before` 접근에서 TypeError 로 죽던 결함을
// 2026-09-14 F5-W1 실서버 계약 시험(approval_id=2)이 잡아 여기서 null 을 명시적으로 다룬다.
//
// 이 학원 시드 데이터는 대기 건에 한해 고정 노선이 없어 422 ROUTE_NOT_CONFIGURED_FOR_RUN 가
// 나는데, 이 코드는 apiErrorCodes.ts 정본 목록에도 API_SPEC §5.5 에도 없다
// (2026-09-12 확인 — 백엔드 ErrorCode.java:203 에는 실재, HTTP 422). 정본 목록을
// 임의로 늘리지 말라는 그 파일의 지시를 존중해 여기서 코드를 추가하지 않고,
// 화면은 ApiError.message 를 그대로 보여주는 방식으로 이 간극을 흡수한다.
export const getChangeApprovalDetail = async (approvalId: number): Promise<ChangeApprovalDetailResponseTypes> => {
  const raw = await apiFetch<RawChangeApprovalDetail>(`/staff/approvals/${approvalId}`, { method: "GET" });
  return {
    ...toSummary(raw),
    routePreview: raw.route_preview
      ? {
          stopsBefore: raw.route_preview.stops_before.map(toRouteStop),
          stopsAfter: raw.route_preview.stops_after.map(toRouteStop),
          reordered: raw.route_preview.reordered,
          removed: raw.route_preview.removed,
          roadPathBefore: raw.route_preview.road_path_before,
          roadPathAfter: raw.route_preview.road_path_after,
        }
      : null,
    departTime: raw.depart_time ?? null,
    estTimeBefore: raw.est_time_before,
    estTimeAfter: raw.est_time_after,
    estDistanceBefore: raw.est_distance_before,
    estDistanceAfter: raw.est_distance_after,
    estDurationBefore: raw.est_duration_before,
    estDurationAfter: raw.est_duration_after,
    affectedStudents: raw.affected_students.map((s) => ({ studentId: s.student_id, name: s.name })),
    capacity: { studentCapacity: raw.capacity.student_capacity, assigned: raw.capacity.assigned },
    previewToken: raw.preview_token,
    previewStale: raw.preview_stale,
  };
};

type RawChangeApprovalDecideResponse = {
  status: "approved" | "rejected" | "auto_rejected";
  stop_removed: boolean;
  route_version: number;
  decided_by: string;
  decided_at: string;
};

// POST /staff/approvals/{id}/decide (§5.6, A-05).
// approve=true 면 previewToken 필수(불일치·만료 → 409 PREVIEW_STALE).
// approve=false 면 rejectReason 필수(§8.3 정본 — 없으면 422 VALIDATION_FAILED).
// 운행 시작 이후 도달한 조작은 403 CHANGE_WINDOW_CLOSED(Ruling 200 정정 — 409 아님).
export const decideChangeApproval = async (
  approvalId: number,
  payload: ChangeApprovalDecideRequestTypes,
): Promise<ChangeApprovalDecideResponseTypes> => {
  const body: Record<string, unknown> = { approve: payload.approve };
  if (payload.rejectReason !== undefined) {
    body.reject_reason = payload.rejectReason;
  }
  if (payload.previewToken !== undefined) {
    body.preview_token = payload.previewToken;
  }

  const raw = await apiFetch<RawChangeApprovalDecideResponse>(`/staff/approvals/${approvalId}/decide`, {
    method: "POST",
    body,
  });
  return {
    status: raw.status,
    stopRemoved: raw.stop_removed,
    routeVersion: raw.route_version,
    decidedBy: raw.decided_by,
    decidedAt: raw.decided_at,
  };
};
