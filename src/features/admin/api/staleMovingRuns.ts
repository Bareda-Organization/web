import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { ForceFinishResponseTypes, StaleMovingRunListResponseTypes } from "../types";

type RawStaleMovingRunListResponse = {
  items: {
    run_id: string | number;
    academy_id: string | number;
    academy_name: string;
    service_date: string;
    direction: "to_academy" | "from_academy";
    bus_no: string;
    started_at: string | null;
    finish_pending: boolean;
    boarded_count: number;
  }[];
};

type RawForceFinishResponse = {
  run_id: string | number;
  finished_at: string;
  boarded_count: number;
};

// GET /admin/runs/stale-moving (§6.16) — `StaleMovingRun` 경보가 세는 회차(운행일이 어제보다 이른 미취소 이동 중 회차)와 같다. 운행일 오름차순.
export const getStaleMovingRuns = async (): Promise<StaleMovingRunListResponseTypes> => {
  const raw = await apiFetch<RawStaleMovingRunListResponse>("/admin/runs/stale-moving", { method: "GET" });
  return {
    items: raw.items.map((item) => ({
      runId: asIdString(item.run_id),
      academyId: asIdString(item.academy_id),
      academyName: item.academy_name,
      serviceDate: item.service_date,
      direction: item.direction,
      busNo: item.bus_no,
      startedAt: item.started_at,
      finishPending: item.finish_pending,
      boardedCount: item.boarded_count,
    })),
  };
};

// POST /admin/runs/{runId}/force-finish (§6.17). 되돌릴 수 없는 동작 — 탑승자 상태·알림은 건드리지 않고 회차만 닫는다.
// reason 은 공백만으로 채울 수 없다(빈 문자열 검증은 호출부 화면에서 막는다).
// 화면이 코드로 분기하는 오류 — RUN_NOT_MOVING·RUN_NOT_STALE·RUN_CANCELED(§6.17 · §8 사전에 등재, `apiErrorCodes.ts`).
export const forceFinishRun = async (runId: string, reason: string): Promise<ForceFinishResponseTypes> => {
  const raw = await apiFetch<RawForceFinishResponse>(`/admin/runs/${runId}/force-finish`, {
    method: "POST",
    body: { reason },
  });
  return { runId: asIdString(raw.run_id), finishedAt: raw.finished_at, boardedCount: raw.boarded_count };
};
