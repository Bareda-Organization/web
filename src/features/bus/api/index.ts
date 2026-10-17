import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  BusCapacityWarningResponseTypes,
  BusItemResponseTypes,
  BusListResponseTypes,
  BusUpdateResponseTypes,
  BusTodayRunTypes,
  BusUpsertRequestTypes,
} from "../types";

// Ruling 816 — routeCount·scheduleCount·todayRuns 는 목록 응답에만 오고(아직 안 주는 서버도 있다), id 는 숫자로 온다.
type WireBus = Omit<WithId<BusItemResponseTypes, "id">, "routeCount" | "scheduleCount" | "todayRuns"> & {
  routeCount?: number;
  scheduleCount?: number;
  todayRuns?: WithId<BusTodayRunTypes, "runId">[];
};

const toBus = (raw: WireBus): BusItemResponseTypes => ({
  ...raw,
  id: asIdString(raw.id),
  routeCount: raw.routeCount ?? 0,
  scheduleCount: raw.scheduleCount ?? 0,
  todayRuns: (raw.todayRuns ?? []).map((run) => ({ ...run, runId: asIdString(run.runId) })),
});

// GET /staff/buses (§5.12, BUS-01) — §1.8 페이징 목록 화면 전부가 이 규약을 탄다.
export const getBuses = async (page: number, size = 20): Promise<BusListResponseTypes> => {
  const raw = await apiFetch<Omit<BusListResponseTypes, "items"> & { items: WireBus[] }>("/staff/buses", {
    method: "GET",
    query: { page, size },
  });
  return { ...raw, items: raw.items.map(toBus) };
};

const toRawUpsert = (request: BusUpsertRequestTypes) => ({
  bus_no: request.busNo,
  plate_no: request.plateNo,
  capacity: request.capacity,
  operable: request.operable,
});

// POST /staff/buses (BUS-02) — 등록. 409 DUPLICATE_BUS_NO · 409 CAPACITY_EXCEEDED 는 호출부가 ApiError 로 받는다.
export const createBus = async (request: BusUpsertRequestTypes): Promise<BusItemResponseTypes> => {
  const raw = await apiFetch<WireBus>("/staff/buses", { method: "POST", body: toRawUpsert(request) });
  return toBus(raw);
};

// PATCH 전용 — 목록·등록 응답에는 없다(§5.12 본문). 서버 id 는 숫자.
const toCapacityWarning = (raw: WithId<BusCapacityWarningResponseTypes, "runId">): BusCapacityWarningResponseTypes => ({
  ...raw,
  runId: asIdString(raw.runId),
});

// PATCH /staff/buses/{id} (BUS-03) — 상세 GET 이 사양에 없어(§5.12) 목록 행 데이터로 폼을 채운다.
// warnings[](BR-116) — 정원 축소로 기배정 인원이 넘치는 회차가 있어도 저장은
// 되고 경고만 실려 온다(§5.14 배치 경고와 같은 축).
export const updateBus = async (id: string, request: BusUpsertRequestTypes): Promise<BusUpdateResponseTypes> => {
  const raw = await apiFetch<WireBus & { warnings: WithId<BusCapacityWarningResponseTypes, "runId">[] }>(`/staff/buses/${id}`, { method: "PATCH", body: toRawUpsert(request) });
  return { ...toBus(raw), warnings: raw.warnings.map(toCapacityWarning) };
};
