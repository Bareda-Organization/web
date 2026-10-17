import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { EmergenciesResponseTypes, EmergencyItemResponseTypes, EmergencyPositionResponseTypes } from "../types";
import type { WithId } from "./wireId";

// 서버는 위치 기록이 없으면 null 이 아니라 세 값이 모두 null 인 객체를 준다(§5.16 · Ruling 848 ③).
type WirePosition = { lat: number | null; lng: number | null; recordedAt: string | null } | null;

type WireEmergencyItem = Omit<EmergencyItemResponseTypes, "emergencyId" | "academy" | "runId" | "position"> & {
  emergencyId: string | number;
  academy: WithId<EmergencyItemResponseTypes["academy"], "id">;
  runId: string | number;
  position: WirePosition;
};

const toPosition = (raw: WirePosition): EmergencyPositionResponseTypes =>
  raw && raw.lat !== null && raw.lng !== null ? { lat: raw.lat, lng: raw.lng, recordedAt: raw.recordedAt } : null;

// 서버 id 는 숫자 · 위치 없음 객체를 null 로 · occurredAt 은 없으면 null
const toEmergencyItem = (raw: WireEmergencyItem): EmergencyItemResponseTypes => ({
  ...raw,
  emergencyId: asIdString(raw.emergencyId),
  academy: { ...raw.academy, id: asIdString(raw.academy.id) },
  runId: asIdString(raw.runId),
  position: toPosition(raw.position),
  occurredAt: raw.occurredAt ?? null,
});

// GET /admin/emergencies (§6.11, O-07). status·academy_id 쿼리는 목록 화면의 필터에 대응한다.
export const getEmergencies = async (status?: string, academyId?: string): Promise<EmergenciesResponseTypes> => {
  const raw = await apiFetch<Omit<EmergenciesResponseTypes, "items"> & { items: WireEmergencyItem[] }>("/admin/emergencies", {
    method: "GET",
    query: { status, academy_id: academyId },
  });
  return { ...raw, items: raw.items.map(toEmergencyItem) };
};
