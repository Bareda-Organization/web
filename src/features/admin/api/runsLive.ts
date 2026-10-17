import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { AcademyRunsLiveResponseTypes, RunLiveItemResponseTypes } from "../types";
import type { WithId } from "@/shared/lib/http/wireId";

// 서버가 아직 안 주면 없는 칸(delayMinutes · finishedAt, Ruling 805)과 id 숫자를 받는 서버 모양.
type WireRunLiveItem = Omit<RunLiveItemResponseTypes, "runId" | "stops"> & {
  runId: string | number;
  stops: WithId<RunLiveItemResponseTypes["stops"][number], "stopId">[];
};

// 서버 id 는 숫자 · delayMinutes · finishedAt 은 없으면 null.
// ⚠ 배치되지 않은 회차(idle · confirmed, Ruling 315)는 driver · escort 가 null — 그대로 통과시키되 undefined 는 null 로 맞춘다.
const toRunLiveItem = (raw: WireRunLiveItem): RunLiveItemResponseTypes => ({
  ...raw,
  runId: asIdString(raw.runId),
  stops: raw.stops.map((stop) => ({ ...stop, stopId: asIdString(stop.stopId) })),
  driver: raw.driver ?? null,
  escort: raw.escort ?? null,
  delayMinutes: raw.delayMinutes ?? null,
  finishedAt: raw.finishedAt ?? null,
});

// GET /admin/academies/{id}/runs/live (§6.8, O-05 · O-06). 학원 경계를 넘나드는 화면이라
// 호출부(컴포넌트)가 학원 목록을 먼저 받아 이 함수를 학원마다 돌린다.
export const getAcademyRunsLive = async (academyId: string): Promise<AcademyRunsLiveResponseTypes> => {
  const raw = await apiFetch<{ runs: WireRunLiveItem[] }>(`/admin/academies/${academyId}/runs/live`, {
    method: "GET",
  });
  return { runs: raw.runs.map(toRunLiveItem) };
};
