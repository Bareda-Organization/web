import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type { RunLiveItemResponseTypes, RunsLiveResponseTypes } from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열.
type WireRunLiveItem = WithId<RunLiveItemResponseTypes, "runId">;

// GET /staff/runs/live (§5.18, LOC-01, A-14) — status='moving' 인 회차만 온다.
// 5~10초 폴링 대상. §5.3 대시보드와 달리 지표·확인상태는 안 주고 위치·진행률만 준다 —
// lat·lng 는 DashboardPage·TodayRunPage 양쪽에서 버스 마커 좌표로 쓴다. position 이
// null 이면 lastSeenAt 으로 "최근 확인 N분 전" 텍스트만 보여준다(MON-07 정지 위치 규칙).
export const getRunsLive = async (): Promise<RunsLiveResponseTypes> => {
  const raw = await apiFetch<{ runs: WireRunLiveItem[] }>("/staff/runs/live", { method: "GET" });
  return { runs: raw.runs.map((run) => ({ ...run, runId: asIdString(run.runId) })) };
};
