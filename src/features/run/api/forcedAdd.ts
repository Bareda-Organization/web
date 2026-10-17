import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { ForcedAddRequestTypes, ForcedAddResponseTypes } from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열.
type WireForcedAdd = Omit<ForcedAddResponseTypes, "forcedAdditionId" | "runId" | "studentId" | "stopId"> &
  Record<"forcedAdditionId" | "runId" | "studentId" | "stopId", string | number>;

// POST /staff/runs/{runId}/forced-add (§5.7, A-07).
// ①구간(출발 30분 이전)에서만 허용 — 그 밖이면 403 CHANGE_WINDOW_CLOSED.
// 되돌릴 수 없는 조작이라 화면 쪽에 확인 단계를 반드시 둔다.
// student_id 와 new_student.name 은 배타적 — 서버가 422 VALIDATION_FAILED 로 판정한다.
export const postForcedAdd = async (
  runId: string,
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

  const raw = await apiFetch<WireForcedAdd>(`/staff/runs/${runId}/forced-add`, {
    method: "POST",
    body,
  });
  return {
    ...raw,
    forcedAdditionId: asIdString(raw.forcedAdditionId),
    runId: asIdString(raw.runId),
    studentId: asIdString(raw.studentId),
    stopId: asIdString(raw.stopId),
  };
};
