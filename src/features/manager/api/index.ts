import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  ManagerItemResponseTypes,
  ManagerListResponseTypes,
  ManagerUpsertRequestTypes,
  WorkHours,
} from "../types";

type RawManager = {
  id: string | number;
  name: string;
  phone: string;
  role: "driver" | "escort";
  work_hours: WorkHours | null;
  account_id: string | null;
  // Ruling 817 — 목록 응답에만(아직 안 주는 서버를 견디려고 선택 필드).
  assigned_run_count?: number;
  assignments?: {
    run_id: string | number;
    service_date: string;
    bus_no: string;
    direction: "to_academy" | "from_academy";
    depart_time: string;
    status: "idle" | "confirmed" | "moving" | "finished";
  }[];
};

type RawManagerListResponse = {
  items: RawManager[];
  counts?: { assigned_today: number; unassigned_today: number };
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

const toManager = (raw: RawManager): ManagerItemResponseTypes => ({
  id: asIdString(raw.id),
  name: raw.name,
  phone: raw.phone,
  role: raw.role,
  workHours: raw.work_hours,
  accountId: raw.account_id,
  assignedRunCount: raw.assigned_run_count ?? 0,
  assignments: (raw.assignments ?? []).map((a) => ({
    runId: asIdString(a.run_id),
    serviceDate: a.service_date,
    busNo: a.bus_no,
    direction: a.direction,
    departTime: a.depart_time,
    status: a.status,
  })),
});

export type ManagerListFilters = { role?: "driver" | "escort"; assignedToday?: boolean };

// GET /staff/managers?q=&role=&assigned_today= (§5.13, MGR-01) — §1.8 페이징 목록 화면 전부가 이 규약을 탄다.
export const getManagers = async (page: number, size = 20, q?: string, filters: ManagerListFilters = {}): Promise<ManagerListResponseTypes> => {
  const raw = await apiFetch<RawManagerListResponse>("/staff/managers", {
    method: "GET",
    query: { page, size, q: q || undefined, role: filters.role, assigned_today: filters.assignedToday },
  });
  return {
    items: raw.items.map(toManager),
    counts: raw.counts ? { assignedToday: raw.counts.assigned_today, unassignedToday: raw.counts.unassigned_today } : null,
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

const toRawUpsert = (request: ManagerUpsertRequestTypes) => ({
  name: request.name,
  phone: request.phone,
  role: request.role,
  work_hours: request.workHours,
});

// POST /staff/managers (MGR-02) — 등록.
export const createManager = async (request: ManagerUpsertRequestTypes): Promise<ManagerItemResponseTypes> => {
  const raw = await apiFetch<RawManager>("/staff/managers", { method: "POST", body: toRawUpsert(request) });
  return toManager(raw);
};

// PATCH /staff/managers/{id} (MGR-03) — 상세 GET 이 사양에 없어 목록 행 데이터로 폼을 채운다.
export const updateManager = async (
  id: string,
  request: ManagerUpsertRequestTypes,
): Promise<ManagerItemResponseTypes> => {
  const raw = await apiFetch<RawManager>(`/staff/managers/${id}`, { method: "PATCH", body: toRawUpsert(request) });
  return toManager(raw);
};

// DELETE /staff/managers/{id} (MGR-04) — 배치 중이면 409 MANAGER_ASSIGNED. 화면이 그 경계를 그대로 안내한다.
export const deleteManager = async (id: string): Promise<void> => {
  await apiFetch<void>(`/staff/managers/${id}`, { method: "DELETE" });
};
