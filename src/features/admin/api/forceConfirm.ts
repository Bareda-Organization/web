import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { ForceConfirmResponseTypes } from "../types";
import type { WithId } from "@/shared/lib/http/wireId";

// POST /admin/runs/{runId}/force-confirm (§6.14, UF-O-07). 되돌릴 수 없는 동작 —
// reason 은 공백만으로 채울 수 없다(빈 문자열 검증은 호출부 화면에서 막는다).
// 화면이 코드로 분기하는 오류 — RUN_NOT_IDLE·RUN_NOT_DUE·RUN_CANCELED(§6.14 · §8 사전에 등재, `apiErrorCodes.ts`).
export const forceConfirmRun = async (runId: string, reason: string): Promise<ForceConfirmResponseTypes> => {
  const raw = await apiFetch<WithId<ForceConfirmResponseTypes, "runId" | "routeVersionId">>(`/admin/runs/${runId}/force-confirm`, {
    method: "POST",
    body: { reason },
  });
  // 서버 id 는 숫자 — 화면 타입은 문자열
  return { ...raw, runId: asIdString(raw.runId), routeVersionId: asIdString(raw.routeVersionId) };
};
