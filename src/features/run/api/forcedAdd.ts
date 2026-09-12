import { apiFetch } from "@/shared/lib/http";
import type { ForcedAddRequestTypes, ForcedAddResponseTypes } from "../types";

type RawForcedAddResponse = {
  forced_addition_id: number;
  run_id: number;
  student_id: number;
  stop_id: number;
  status: "staged";
};

// POST /staff/runs/{runId}/forced-add (§5.7, A-07).
// ①구간(출발 30분 이전)에서만 허용 — 그 밖이면 403 CHANGE_WINDOW_CLOSED.
// 되돌릴 수 없는 조작이라 화면 쪽에 확인 단계를 반드시 둔다(BRIEF §3-3).
// student_id 와 new_student.name 은 배타적 — 서버가 422 VALIDATION_FAILED 로 판정한다.
export const postForcedAdd = async (
  runId: number,
  payload: ForcedAddRequestTypes,
): Promise<ForcedAddResponseTypes> => {
  const body: Record<string, unknown> = {
    address: payload.address,
    note: payload.note,
  };
  if (payload.studentId !== undefined) {
    body.student_id = payload.studentId;
  } else if (payload.newStudentName !== undefined) {
    body.new_student = { name: payload.newStudentName };
  }

  const raw = await apiFetch<RawForcedAddResponse>(`/staff/runs/${runId}/forced-add`, {
    method: "POST",
    body,
  });
  return {
    forcedAdditionId: raw.forced_addition_id,
    runId: raw.run_id,
    studentId: raw.student_id,
    stopId: raw.stop_id,
    status: raw.status,
  };
};
