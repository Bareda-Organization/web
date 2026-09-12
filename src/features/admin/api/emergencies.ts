import { apiFetch } from "@/shared/lib/http";
import type {
  EmergenciesResponseTypes,
  EmergencyAcademyRefResponseTypes,
  EmergencyItemResponseTypes,
  EmergencyPersonResponseTypes,
  EmergencyPositionResponseTypes,
  EmergencyType,
} from "../types";

type RawAcademyRef = { id: number; name: string; contact: string };
type RawPerson = { name: string | null; role: string; phone: string | null };
type RawPosition = { lat: number; lng: number; recorded_at: string | null } | null;

type RawEmergencyItem = {
  emergency_id: number;
  academy: RawAcademyRef;
  type: EmergencyType;
  memo: string | null;
  raised_by: RawPerson;
  run_id: number;
  bus_no: string;
  direction: "to_academy" | "from_academy";
  position: RawPosition;
  rider_count: number;
  contacts: RawPerson[];
  raised_at: string;
  staff_acked: boolean;
  acked_at: string | null;
  canceled_at: string | null;
  acked_by: string | null;
  elapsed_since_raised: number;
};

// 실제 응답(curl 확인)의 최상위 키는 `emergencies` 이고 `items` 가 아니다 — §6.11 문서와
// 다르다. 문서를 그대로 믿었다면 목록이 항상 빈 배열로 보였을 것이다.
type RawEmergenciesResponse = { emergencies: RawEmergencyItem[]; unacked_count: number };

const toAcademyRef = (raw: RawAcademyRef): EmergencyAcademyRefResponseTypes => ({
  id: raw.id,
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
  emergencyId: raw.emergency_id,
  academy: toAcademyRef(raw.academy),
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
  staffAcked: raw.staff_acked,
  ackedAt: raw.acked_at,
  canceledAt: raw.canceled_at,
  ackedBy: raw.acked_by,
  elapsedSinceRaised: raw.elapsed_since_raised,
});

// GET /admin/emergencies (§6.11, O-07). status·academy_id 쿼리는 목록 화면의 필터에 대응한다.
export const getEmergencies = async (status?: string, academyId?: number): Promise<EmergenciesResponseTypes> => {
  const raw = await apiFetch<RawEmergenciesResponse>("/admin/emergencies", {
    method: "GET",
    query: { status, academy_id: academyId },
  });
  return {
    emergencies: raw.emergencies.map(toEmergencyItem),
    unackedCount: raw.unacked_count,
  };
};
