import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { RunLiveItemResponseTypes, RunsLiveResponseTypes, RunStatus } from "../types";

type RawPosition = {
  lat: number;
  lng: number;
  recorded_at: string;
} | null;

type RawRunLiveItem = {
  run_id: string | number;
  bus_no: string;
  direction: "to_academy" | "from_academy";
  status: RunStatus;
  position: RawPosition;
  current_stop: string | null;
  next_stop: string | null;
  progress: { done: number; total: number };
  delay_minutes: number | null;
  driver_name: string | null;
  escort_name: string | null;
  last_seen_at: string | null;
};

type RawRunsLive = {
  runs: RawRunLiveItem[];
};

const toRunLiveItem = (raw: RawRunLiveItem): RunLiveItemResponseTypes => ({
  runId: asIdString(raw.run_id),
  busNo: raw.bus_no,
  direction: raw.direction,
  status: raw.status,
  position: raw.position
    ? { lat: raw.position.lat, lng: raw.position.lng, recordedAt: raw.position.recorded_at }
    : null,
  currentStop: raw.current_stop,
  nextStop: raw.next_stop,
  progress: raw.progress,
  delayMinutes: raw.delay_minutes,
  driverName: raw.driver_name,
  escortName: raw.escort_name,
  lastSeenAt: raw.last_seen_at,
});

// GET /staff/runs/live (§5.18, LOC-01, A-14) — status='moving' 인 회차만 온다.
// 5~10초 폴링 대상. §5.3 대시보드와 달리 지표·확인상태는 안 주고 위치·진행률만 준다 —
// lat·lng 는 DashboardPage·TodayRunPage 양쪽에서 버스 마커 좌표로 쓴다. position 이
// null 이면 lastSeenAt 으로 "최근 확인 N분 전" 텍스트만 보여준다(MON-07 정지 위치 규칙).
export const getRunsLive = async (): Promise<RunsLiveResponseTypes> => {
  const raw = await apiFetch<RawRunsLive>("/staff/runs/live", { method: "GET" });
  return { runs: raw.runs.map(toRunLiveItem) };
};
