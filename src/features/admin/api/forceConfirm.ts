import { apiFetch } from "@/shared/lib/http";
import type { ForceConfirmResponseTypes } from "../types";

type RawForceConfirmResponse = {
  run_id: number;
  route_version_id: number;
  fallback_used: true;
  confirmed_at: string;
};

// POST /admin/runs/{runId}/force-confirm (§6.14, O-06). 되돌릴 수 없는 동작 —
// reason 은 공백만으로 채울 수 없다(빈 문자열 검증은 호출부 화면에서 막는다).
// RUN_NOT_IDLE·RUN_NOT_DUE 는 API_SPEC §8·공용 ApiErrorCode 어디에도 없는 코드라
// ApiError.code 의 `(string & {})` 탈출구로 그대로 흘려보낸다 — 화면에서 원문 코드로 분기한다.
export const forceConfirmRun = async (runId: number, reason: string): Promise<ForceConfirmResponseTypes> => {
  const raw = await apiFetch<RawForceConfirmResponse>(`/admin/runs/${runId}/force-confirm`, {
    method: "POST",
    body: { reason },
  });
  return {
    runId: raw.run_id,
    routeVersionId: raw.route_version_id,
    fallbackUsed: raw.fallback_used,
    confirmedAt: raw.confirmed_at,
  };
};
