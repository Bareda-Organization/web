import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { TransferRequestTypes, TransferResponseTypes } from "../types";

type RawTransferResponse = {
  transfer_id: string | number;
  student_id: string | number;
  from_run_id: string | number;
  to_run_id: string | number;
  stop_id: string | number | null;
  status: "staged";
  impact: {
    from: { rider_count_before: number; rider_count_after: number };
    to: { rider_count_before: number; rider_count_after: number; capacity: number };
  };
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

  const raw = await apiFetch<RawTransferResponse>(`/staff/students/${studentId}/transfer`, {
    method: "POST",
    body,
  });
  return {
    transferId: asIdString(raw.transfer_id),
    studentId: asIdString(raw.student_id),
    fromRunId: asIdString(raw.from_run_id),
    toRunId: asIdString(raw.to_run_id),
    stopId: raw.stop_id == null ? null : asIdString(raw.stop_id),
    status: raw.status,
    impact: {
      from: { riderCountBefore: raw.impact.from.rider_count_before, riderCountAfter: raw.impact.from.rider_count_after },
      to: {
        riderCountBefore: raw.impact.to.rider_count_before,
        riderCountAfter: raw.impact.to.rider_count_after,
        capacity: raw.impact.to.capacity,
      },
    },
  };
};
