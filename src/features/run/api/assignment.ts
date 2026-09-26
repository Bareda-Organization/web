import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  AssignmentEntryResponseTypes,
  AssignmentRequestTypes,
  AssignmentResponseTypes,
  AssignmentWarningResponseTypes,
  ManagerRole,
} from "../types";

type RawAssignmentEntry = {
  manager_id: string | number;
  name: string;
  role: ManagerRole;
};

type RawAssignmentWarning = {
  code: AssignmentWarningResponseTypes["code"];
  manager_id: string | number;
  role: ManagerRole;
  message: string;
};

type RawAssignmentResponse = {
  run_id: string | number;
  assignments: RawAssignmentEntry[];
  warnings: RawAssignmentWarning[];
};

const toEntry = (raw: RawAssignmentEntry): AssignmentEntryResponseTypes => ({
  managerId: asIdString(raw.manager_id),
  name: raw.name,
  role: raw.role,
});

const toWarning = (raw: RawAssignmentWarning): AssignmentWarningResponseTypes => ({
  code: raw.code,
  managerId: asIdString(raw.manager_id),
  role: raw.role,
  message: raw.message,
});

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

  const raw = await apiFetch<RawAssignmentResponse>(`/staff/runs/${runId}/assignment`, {
    method: "PATCH",
    body,
  });
  return {
    runId: asIdString(raw.run_id),
    assignments: raw.assignments.map(toEntry),
    warnings: raw.warnings.map(toWarning),
  };
};
