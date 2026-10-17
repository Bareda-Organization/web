import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  AssignmentEntryResponseTypes,
  AssignmentRequestTypes,
  AssignmentResponseTypes,
  AssignmentWarningResponseTypes,
} from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열.
type WireAssignment = Omit<AssignmentResponseTypes, "runId" | "assignments" | "warnings"> & {
  runId: string | number;
  assignments: WithId<AssignmentEntryResponseTypes, "managerId">[];
  warnings: WithId<AssignmentWarningResponseTypes, "managerId">[];
};

// PATCH /staff/runs/{runId}/assignment (§5.14, A-06).
// ⚠ 정본에는 시간 창 제약(CHANGE_WINDOW_CLOSED)이 없다 — WORK_HOURS_MISMATCH ·
// MANAGER_DOUBLE_BOOKED · WORK_HOURS_NOT_SET 3종은 비차단 경고(warnings[])로만 오고
// 요청은 200 으로 성공한다. 차단은 409 DUPLICATE_ASSIGNMENT(같은 역할 중복 배치) 뿐.
export const patchRunAssignment = async (
  runId: string,
  payload: AssignmentRequestTypes,
): Promise<AssignmentResponseTypes> => {
  const body: Record<string, unknown> = {};
  if (payload.driverManagerId !== undefined) {
    body.driver_manager_id = payload.driverManagerId;
  }
  if (payload.escortManagerId !== undefined) {
    body.escort_manager_id = payload.escortManagerId;
  }

  const raw = await apiFetch<WireAssignment>(`/staff/runs/${runId}/assignment`, {
    method: "PATCH",
    body,
  });
  return {
    runId: asIdString(raw.runId),
    assignments: raw.assignments.map((entry) => ({ ...entry, managerId: asIdString(entry.managerId) })),
    warnings: raw.warnings.map((warning) => ({ ...warning, managerId: asIdString(warning.managerId) })),
  };
};
