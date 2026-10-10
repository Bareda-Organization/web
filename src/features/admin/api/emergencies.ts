import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  EmergenciesResponseTypes,
  EmergencyAcademyRefResponseTypes,
  EmergencyItemResponseTypes,
  EmergencyPersonResponseTypes,
  EmergencyPositionResponseTypes,
  EmergencyType,
} from "../types";

type RawAcademyRef = { id: string | number; name: string; contact: string | null };
type RawPerson = { name: string | null; role: string; phone: string | null };
type RawPosition = { lat: number; lng: number; recorded_at: string | null } | null;

type RawEmergencyItem = {
  emergency_id: string | number;
  academy: RawAcademyRef;
  type: EmergencyType;
  memo: string | null;
  raised_by: RawPerson;
  run_id: string | number;
  bus_no: string;
  direction: "to_academy" | "from_academy";
  position: RawPosition;
  rider_count: number;
  contacts: RawPerson[];
  raised_at: string;
  occurred_at?: string | null;
  staff_acked: boolean;
  acked_at: string | null;
  canceled_at: string | null;
  acked_by: { name: string; memo: string | null } | null;
  elapsed_since_raised: number;
};

// BE-R1 목표 2 이전에는 실제 응답의 최상위 키가 `emergencies` 였다(§6.11 문서와 어긋났었다).
// 서버가 §6.11·§5.16 대로 `items` 를 내려보내게 고쳐져 이 어댑터도 함께 맞춘다.
type RawEmergenciesResponse = { items: RawEmergencyItem[]; unacked_count: number; counts?: { open: number; acked: number; canceled: number } };

const toAcademyRef = (raw: RawAcademyRef): EmergencyAcademyRefResponseTypes => ({
  id: asIdString(raw.id),
  name: raw.name,
  contact: raw.contact,
});

const toPerson = (raw: RawPerson): EmergencyPersonResponseTypes => ({
  name: raw.name,
  role: raw.role,
  phone: raw.phone,
});

const toPosition = (raw: RawPosition): EmergencyPositionResponseTypes =>
  raw ? { lat: raw.lat, lng: raw.lng, recordedAt: raw.recorded_at } : null;

const toEmergencyItem = (raw: RawEmergencyItem): EmergencyItemResponseTypes => ({
  emergencyId: asIdString(raw.emergency_id),
  academy: toAcademyRef(raw.academy),
  type: raw.type,
  memo: raw.memo,
  raisedBy: toPerson(raw.raised_by),
  runId: asIdString(raw.run_id),
  busNo: raw.bus_no,
  direction: raw.direction,
  position: toPosition(raw.position),
  riderCount: raw.rider_count,
  contacts: raw.contacts.map(toPerson),
  raisedAt: raw.raised_at,
  occurredAt: raw.occurred_at ?? null,
  staffAcked: raw.staff_acked,
  ackedAt: raw.acked_at,
  canceledAt: raw.canceled_at,
  ackedBy: raw.acked_by,
  elapsedSinceRaised: raw.elapsed_since_raised,
});

// GET /admin/emergencies (§6.11, O-07). status·academy_id 쿼리는 목록 화면의 필터에 대응한다.
export const getEmergencies = async (status?: string, academyId?: string): Promise<EmergenciesResponseTypes> => {
  const raw = await apiFetch<RawEmergenciesResponse>("/admin/emergencies", {
    method: "GET",
    query: { status, academy_id: academyId },
  });
  return {
    items: raw.items.map(toEmergencyItem),
    unackedCount: raw.unacked_count,
    counts: raw.counts,
  };
};
