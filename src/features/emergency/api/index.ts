import { apiFetch } from "@/shared/lib/http";
import type {
  AckEmergencyResponseTypes,
  EmergencyItemResponseTypes,
  EmergencyListQueryTypes,
  EmergencyListResponseTypes,
  EmergencyPersonTypes,
  EmergencyPositionTypes,
  EmergencyType,
} from "../types";

type RawEmergencyItem = {
  emergency_id: number;
  type: EmergencyType;
  memo: string | null;
  raised_by: { name: string | null; role: "driver" | "escort"; phone: string | null };
  run_id: number;
  bus_no: string;
  direction: "to_academy" | "from_academy";
  position: { lat: number; lng: number; recorded_at: string | null };
  rider_count: number;
  contacts: { name: string; role: "driver" | "escort"; phone: string }[];
  raised_at: string;
  acked_at: string | null;
  canceled_at: string | null;
  acked: boolean;
  acked_by: { name: string } | null;
};

// §5.16 실측 봉투 — `items[]` 가 아니라 `emergencies[]` 다(types/index.ts 주석 참고).
type RawEmergencyListResponse = {
  emergencies: RawEmergencyItem[];
  unacked_count: number;
};

const toPerson = (raw: RawEmergencyItem["raised_by"]): EmergencyPersonTypes => ({
  name: raw.name,
  role: raw.role,
  phone: raw.phone,
});

const toPosition = (raw: RawEmergencyItem["position"]): EmergencyPositionTypes => ({
  lat: raw.lat,
  lng: raw.lng,
  recordedAt: raw.recorded_at,
});

const toItem = (raw: RawEmergencyItem): EmergencyItemResponseTypes => ({
  emergencyId: raw.emergency_id,
  type: raw.type,
  memo: raw.memo,
  raisedBy: toPerson(raw.raised_by),
  runId: raw.run_id,
  busNo: raw.bus_no,
  direction: raw.direction,
  position: toPosition(raw.position),
  riderCount: raw.rider_count,
  contacts: raw.contacts.map(toPerson),
  raisedAt: raw.raised_at,
  ackedAt: raw.acked_at,
  canceledAt: raw.canceled_at,
  acked: raw.acked,
  ackedBy: raw.acked_by,
});

// GET /staff/emergencies(§5.16, EXC-04, A-16) — 페이징 없음(page·size·total_count·
// has_next 필드 부재, 실측 확인). 기본 status=open.
export const getEmergencies = async (
  filters: EmergencyListQueryTypes = {},
): Promise<EmergencyListResponseTypes> => {
  const raw = await apiFetch<RawEmergencyListResponse>("/staff/emergencies", {
    method: "GET",
    query: { status: filters.status, date: filters.date },
  });
  return {
    items: raw.emergencies.map(toItem),
    unackedCount: raw.unacked_count,
  };
};

// POST /staff/emergencies/{id}/ack — 이미 확인된 건은 409 ALREADY_ACKED.
export const ackEmergency = async (emergencyId: number): Promise<AckEmergencyResponseTypes> => {
  const raw = await apiFetch<{ emergency_id: number; acked_at: string }>(
    `/staff/emergencies/${emergencyId}/ack`,
    { method: "POST" },
  );
  return { emergencyId: raw.emergency_id, ackedAt: raw.acked_at };
};
