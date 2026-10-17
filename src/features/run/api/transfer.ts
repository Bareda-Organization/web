import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { TransferRequestTypes, TransferResponseTypes } from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열. stopId 는 null 일 수 있다.
type WireTransfer = Omit<TransferResponseTypes, "transferId" | "studentId" | "fromRunId" | "toRunId" | "stopId"> & {
  transferId: string | number;
  studentId: string | number;
  fromRunId: string | number;
  toRunId: string | number;
  stopId: string | number | null;
};

// POST /staff/students/{studentId}/transfer (§5.8, A-07) — 대기 저장이다(확정 배치가 반영).
// stop_id 와 address 는 배타적이라 값이 있는 쪽만 싣는다 — 둘 다 없거나 있으면 서버가 422.
export const postTransfer = async (
  studentId: string,
  payload: TransferRequestTypes,
): Promise<TransferResponseTypes> => {
  const body: Record<string, unknown> = {
    from_run_id: payload.fromRunId,
    to_run_id: payload.toRunId,
    note: payload.note,
  };
  if (payload.stopId !== undefined) body.stop_id = payload.stopId;
  if (payload.address !== undefined) body.address = payload.address;

  const raw = await apiFetch<WireTransfer>(`/staff/students/${studentId}/transfer`, {
    method: "POST",
    body,
  });
  return {
    ...raw,
    transferId: asIdString(raw.transferId),
    studentId: asIdString(raw.studentId),
    fromRunId: asIdString(raw.fromRunId),
    toRunId: asIdString(raw.toRunId),
    stopId: raw.stopId == null ? null : asIdString(raw.stopId),
  };
};

// DELETE /staff/transfers/{transferId} (§5.8.1, Ruling 369) — 반영 전(staged) 이동 대기를 지운다. 204 본문 부재.
export const deleteTransfer = async (transferId: string): Promise<void> => {
  await apiFetch(`/staff/transfers/${transferId}`, { method: "DELETE" });
};
