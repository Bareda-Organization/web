import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { ForceFinishResponseTypes, StaleMovingRunItemResponseTypes, StaleMovingRunListResponseTypes } from "../types";
import type { WithId } from "./wireId";

// GET /admin/runs/stale-moving (§6.16) — `StaleMovingRun` 경보가 세는 회차(운행일이 어제보다 이른 미취소 이동 중 회차)와 같다. 운행일 오름차순.
export const getStaleMovingRuns = async (): Promise<StaleMovingRunListResponseTypes> => {
  const raw = await apiFetch<{ items: WithId<StaleMovingRunItemResponseTypes, "runId" | "academyId">[] }>("/admin/runs/stale-moving", {
    method: "GET",
  });
  // 서버 id 는 숫자 · academyContact 는 미등록이거나 서버가 안 주면 null (Ruling 808)
  return {
    items: raw.items.map((item) => ({
      ...item,
      runId: asIdString(item.runId),
      academyId: asIdString(item.academyId),
      academyContact: item.academyContact ?? null,
    })),
  };
};

// POST /admin/runs/{runId}/force-finish (§6.17). 되돌릴 수 없는 동작 — 탑승자 상태·알림은 건드리지 않고 회차만 닫는다.
// reason 은 공백만으로 채울 수 없다(빈 문자열 검증은 호출부 화면에서 막는다).
// 화면이 코드로 분기하는 오류 — RUN_NOT_MOVING·RUN_NOT_STALE·RUN_CANCELED(§6.17 · §8 사전에 등재, `apiErrorCodes.ts`).
export const forceFinishRun = async (runId: string, reason: string): Promise<ForceFinishResponseTypes> => {
  const raw = await apiFetch<WithId<ForceFinishResponseTypes, "runId">>(`/admin/runs/${runId}/force-finish`, {
    method: "POST",
    body: { reason },
  });
  // 서버 id 는 숫자 — 화면 타입은 문자열
  return { ...raw, runId: asIdString(raw.runId) };
};
