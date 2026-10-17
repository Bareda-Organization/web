import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  ChangeApprovalAffectedStudentResponseTypes,
  ChangeApprovalDecideRequestTypes,
  ChangeApprovalDecideResponseTypes,
  ChangeApprovalDetailResponseTypes,
  ChangeApprovalSummaryResponseTypes,
  ChangeApprovalsResponseTypes,
  RoutePreviewResponseTypes,
  RouteStopRefResponseTypes,
} from "../types";

type WireChangeApprovalSummary = WithId<ChangeApprovalSummaryResponseTypes, "approvalId" | "runId">;

// 서버 id 는 숫자 — 화면 타입은 문자열
const toSummary = (raw: WireChangeApprovalSummary): ChangeApprovalSummaryResponseTypes => ({
  ...raw,
  approvalId: asIdString(raw.approvalId),
  runId: asIdString(raw.runId),
});

// GET /staff/approvals (§5.5 목록, A-05) — 요약만 준다. `status` 기본값은 pending,
// `page`·`size` 는 §1.8 공통 페이징(Ruling 358, 기본 0·20).
// §9.6 4종(pending·approved·rejected·auto_rejected)을 전부 화면 필터로 연다(Ruling 264).
export const getChangeApprovals = async (
  status?: string,
  page = 0,
  size = 20,
): Promise<ChangeApprovalsResponseTypes> => {
  const raw = await apiFetch<Omit<ChangeApprovalsResponseTypes, "items"> & { items: WireChangeApprovalSummary[] }>(
    "/staff/approvals",
    { method: "GET", query: { status, page, size } },
  );
  return { ...raw, items: raw.items.map(toSummary) };
};

type WireRouteStopRef = WithId<RouteStopRefResponseTypes, "stopId">;

// 상세 중 서버가 아직 안 주거나 null 일 수 있는 필드(Ruling 812) — 아래에서 기본값으로 메운다.
type OptionalDetailKeys = "status" | "decidedAt" | "decidedByName" | "driverName" | "escortName" | "departTime";

type WireChangeApprovalDetail = Omit<
  WithId<ChangeApprovalDetailResponseTypes, "approvalId" | "runId">,
  OptionalDetailKeys | "routePreview" | "affectedStudents"
> &
  Partial<Pick<ChangeApprovalDetailResponseTypes, OptionalDetailKeys>> & {
    routePreview:
      | (Omit<RoutePreviewResponseTypes, "reordered" | "removed"> & {
          reordered: WireRouteStopRef[];
          removed: WireRouteStopRef[];
        })
      | null;
    affectedStudents: WithId<ChangeApprovalAffectedStudentResponseTypes, "studentId">[];
  };

// 서버 id 는 숫자 — 화면 타입은 문자열
const toRouteStopRef = (raw: WireRouteStopRef): RouteStopRefResponseTypes => ({ ...raw, stopId: asIdString(raw.stopId) });

// GET /staff/approvals/{id} (§5.5 상세, A-05) — 대기 건은 조회 시점에 재최적화를 정확히
// 1회 실행하지만, 이미 결정된 건(approved·rejected·auto_rejected)은 재최적화를 하지 않고
// `route_preview`·`est_time_*`·`est_distance_*`·`preview_token` 을 전부 null 로 돌려준다
// (백엔드 `StaffApprovalControllerTest#결정된_건의_상세_조회는_재최적화를_실행하지_않는다`).
// routePreview 가 null 인 건은 화면이 그대로 받는다.
//
// 대기 건의 고정 노선이 없으면 422 ROUTE_NOT_CONFIGURED_FOR_RUN 가 나는데, 이 코드는 apiErrorCodes.ts 정본 목록에도
// API_SPEC §5.5 에도 없다(백엔드 ErrorCode.java 에는 실재, HTTP 422). 정본 목록을 임의로 늘리지 않으려
// 화면은 ApiError.message 를 그대로 보여주는 방식으로 이 간극을 흡수한다.
export const getChangeApprovalDetail = async (approvalId: string): Promise<ChangeApprovalDetailResponseTypes> => {
  const raw = await apiFetch<WireChangeApprovalDetail>(`/staff/approvals/${approvalId}`, { method: "GET" });
  return {
    ...raw,
    ...toSummary(raw),
    routePreview: raw.routePreview
      ? { ...raw.routePreview, reordered: raw.routePreview.reordered.map(toRouteStopRef), removed: raw.routePreview.removed.map(toRouteStopRef) }
      : null,
    // 서버가 안 주면 pending · null (Ruling 812)
    status: raw.status ?? "pending",
    decidedAt: raw.decidedAt ?? null,
    decidedByName: raw.decidedByName ?? null,
    driverName: raw.driverName ?? null,
    escortName: raw.escortName ?? null,
    departTime: raw.departTime ?? null,
    affectedStudents: raw.affectedStudents.map((s) => ({ ...s, studentId: asIdString(s.studentId) })),
  };
};

// POST /staff/approvals/{id}/decide (§5.6, A-05).
// approve=true 면 previewToken 필수(불일치·만료 → 409 PREVIEW_STALE).
// approve=false 면 rejectReason 필수(§8.3 정본 — 없으면 422 VALIDATION_FAILED).
// 운행 시작 이후 도달한 조작은 403 CHANGE_WINDOW_CLOSED(Ruling 200 정정 — 409 아님).
export const decideChangeApproval = async (
  approvalId: string,
  payload: ChangeApprovalDecideRequestTypes,
): Promise<ChangeApprovalDecideResponseTypes> => {
  const body: Record<string, unknown> = { approve: payload.approve };
  if (payload.rejectReason !== undefined) {
    body.reject_reason = payload.rejectReason;
  }
  if (payload.previewToken !== undefined) {
    body.preview_token = payload.previewToken;
  }

  return apiFetch<ChangeApprovalDecideResponseTypes>(`/staff/approvals/${approvalId}/decide`, {
    method: "POST",
    body,
  });
};
