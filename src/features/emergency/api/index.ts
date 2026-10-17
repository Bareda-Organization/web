import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  AckEmergencyResponseTypes,
  EmergencyItemResponseTypes,
  EmergencyListQueryTypes,
  EmergencyListResponseTypes,
} from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열. occurredAt 은 안 오면 null 로 메운다.
type WireEmergencyItem = Omit<WithId<EmergencyItemResponseTypes, "emergencyId" | "runId">, "occurredAt"> & {
  occurredAt?: string | null;
};

const toItem = (raw: WireEmergencyItem): EmergencyItemResponseTypes => ({
  ...raw,
  emergencyId: asIdString(raw.emergencyId),
  runId: asIdString(raw.runId),
  occurredAt: raw.occurredAt ?? null,
});

// GET /staff/emergencies(§5.16, EXC-04, A-16) — 페이징 없음(page·size·total_count·
// has_next 필드 부재, 실측 확인). 기본 status=open.
export const getEmergencies = async (
  filters: EmergencyListQueryTypes = {},
): Promise<EmergencyListResponseTypes> => {
  const raw = await apiFetch<Omit<EmergencyListResponseTypes, "items"> & { items: WireEmergencyItem[] }>("/staff/emergencies", {
    method: "GET",
    query: { status: filters.status, date: filters.date },
  });
  return { ...raw, items: raw.items.map(toItem) };
};

// POST /staff/emergencies/{id}/ack — 이미 확인된 건은 409 ALREADY_ACKED. 조치 메모(선택, 200자 이하 · Ruling 541)가
// 있을 때만 본문 `{memo}` 를 보낸다 — 본문 없는 확인도 그대로 동작한다.
export const ackEmergency = async (emergencyId: string, memo?: string): Promise<AckEmergencyResponseTypes> => {
  const raw = await apiFetch<WithId<AckEmergencyResponseTypes, "emergencyId">>(
    `/staff/emergencies/${emergencyId}/ack`,
    memo ? { method: "POST", body: { memo } } : { method: "POST" },
  );
  return { ...raw, emergencyId: asIdString(raw.emergencyId) };
};
