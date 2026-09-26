import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { BusItemResponseTypes, BusListResponseTypes, BusUpsertRequestTypes } from "../types";

type RawBus = {
  id: string | number;
  bus_no: string;
  plate_no: string;
  capacity: number;
  student_capacity: number;
  operable: boolean;
};

type RawBusListResponse = {
  items: RawBus[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toBus = (raw: RawBus): BusItemResponseTypes => ({
  id: asIdString(raw.id),
  busNo: raw.bus_no,
  plateNo: raw.plate_no,
  capacity: raw.capacity,
  studentCapacity: raw.student_capacity,
  operable: raw.operable,
});

// GET /staff/buses (§5.12, BUS-01) — §1.8 페이징 목록 화면 전부가 이 규약을 탄다.
export const getBuses = async (page: number, size = 20): Promise<BusListResponseTypes> => {
  const raw = await apiFetch<RawBusListResponse>("/staff/buses", { method: "GET", query: { page, size } });
  return {
    items: raw.items.map(toBus),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

const toRawUpsert = (request: BusUpsertRequestTypes) => ({
  bus_no: request.busNo,
  plate_no: request.plateNo,
  capacity: request.capacity,
  operable: request.operable,
});

// POST /staff/buses (BUS-02) — 등록. 409 DUPLICATE_BUS_NO · 409 CAPACITY_EXCEEDED 는 호출부가 ApiError 로 받는다.
export const createBus = async (request: BusUpsertRequestTypes): Promise<BusItemResponseTypes> => {
  const raw = await apiFetch<RawBus>("/staff/buses", { method: "POST", body: toRawUpsert(request) });
  return toBus(raw);
};

// PATCH /staff/buses/{id} (BUS-03) — 상세 GET 이 사양에 없어(§5.12) 목록 행 데이터로 폼을 채운다.
export const updateBus = async (id: string, request: BusUpsertRequestTypes): Promise<BusItemResponseTypes> => {
  const raw = await apiFetch<RawBus>(`/staff/buses/${id}`, { method: "PATCH", body: toRawUpsert(request) });
  return toBus(raw);
};
