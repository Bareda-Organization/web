import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  AcademyRunsLiveResponseTypes,
  LiveContactResponseTypes,
  LivePositionResponseTypes,
  LiveStopResponseTypes,
  RunLiveItemResponseTypes,
  RunStatus,
} from "../types";

type RawPosition = { lat: number; lng: number; received_at: string } | null;

type RawLiveStop = {
  stop_id: string | number;
  seq: number;
  name: string;
  lat: number;
  lng: number;
  change: string | null;
  arrived_at: string | null;
  eta: string | null;
};

type RawContact = { name: string; phone: string } | null;

type RawRunLiveItem = {
  run_id: string | number;
  bus_no: string;
  direction: "to_academy" | "from_academy";
  run_status: RunStatus;
  position: RawPosition;
  last_seen_at: string | null;
  depart_time: string;
  est_depart_time: string;
  stops: RawLiveStop[];
  destination_eta: string | null;
  driver: RawContact;
  escort: RawContact;
};

type RawAcademyRunsLiveResponse = { runs: RawRunLiveItem[] };

const toPosition = (raw: RawPosition): LivePositionResponseTypes =>
  raw ? { lat: raw.lat, lng: raw.lng, receivedAt: raw.received_at } : null;

const toStop = (raw: RawLiveStop): LiveStopResponseTypes => ({
  stopId: asIdString(raw.stop_id),
  seq: raw.seq,
  name: raw.name,
  lat: raw.lat,
  lng: raw.lng,
  change: raw.change,
  arrivedAt: raw.arrived_at,
  eta: raw.eta,
});

// ⚠ 배치되지 않은 회차는 기사·동승자가 없다 — R16 이 §6.8 을 오늘 4종 상태 전부로 넓히면서
// (Ruling 315) idle·confirmed 회차가 목록에 들어왔고, 그 회차에는 배치가 아직 없다. 옛 판은
// moving 만 오던 시절의 가정(항상 배치돼 있다)으로 raw.name 을 바로 읽어 TypeError 로 죽었다.
const toContact = (raw: RawContact): LiveContactResponseTypes | null =>
  raw == null ? null : { name: raw.name, phone: raw.phone };

const toRunLiveItem = (raw: RawRunLiveItem): RunLiveItemResponseTypes => ({
  runId: asIdString(raw.run_id),
  busNo: raw.bus_no,
  direction: raw.direction,
  runStatus: raw.run_status,
  position: toPosition(raw.position),
  lastSeenAt: raw.last_seen_at,
  departTime: raw.depart_time,
  estDepartTime: raw.est_depart_time,
  stops: raw.stops.map(toStop),
  destinationEta: raw.destination_eta,
  driver: toContact(raw.driver),
  escort: toContact(raw.escort),
});

// GET /admin/academies/{id}/runs/live (§6.8, O-05 · O-06). 학원 경계를 넘나드는 화면이라
// 호출부(컴포넌트)가 학원 목록을 먼저 받아 이 함수를 학원마다 돌린다.
export const getAcademyRunsLive = async (academyId: string): Promise<AcademyRunsLiveResponseTypes> => {
  const raw = await apiFetch<RawAcademyRunsLiveResponse>(`/admin/academies/${academyId}/runs/live`, {
    method: "GET",
  });
  return { runs: raw.runs.map(toRunLiveItem) };
};
