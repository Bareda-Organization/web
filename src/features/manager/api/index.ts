import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  ManagerAssignmentTypes,
  ManagerItemResponseTypes,
  ManagerListResponseTypes,
  ManagerUpsertRequestTypes,
} from "../types";

// Ruling 817 — assignedRunCount·assignments 는 목록 응답에만 오고(아직 안 주는 서버도 있다), id 는 숫자로 온다.
type WireManager = Omit<WithId<ManagerItemResponseTypes, "id">, "assignedRunCount" | "assignments"> & {
  assignedRunCount?: number;
  assignments?: WithId<ManagerAssignmentTypes, "runId">[];
};

const toManager = (raw: WireManager): ManagerItemResponseTypes => ({
  ...raw,
  id: asIdString(raw.id),
  assignedRunCount: raw.assignedRunCount ?? 0,
  assignments: (raw.assignments ?? []).map((a) => ({ ...a, runId: asIdString(a.runId) })),
});

export type ManagerListFilters = { role?: "driver" | "escort"; assignedToday?: boolean; linked?: boolean };

// GET /staff/managers?q=&role=&linked=&assigned_today= (§5.13, MGR-01) — §1.8 페이징 목록 화면 전부가 이 규약을 탄다.
export const getManagers = async (page: number, size = 20, q?: string, filters: ManagerListFilters = {}): Promise<ManagerListResponseTypes> => {
  const raw = await apiFetch<Omit<ManagerListResponseTypes, "items" | "counts"> & { items: WireManager[]; counts?: ManagerListResponseTypes["counts"] }>(
    "/staff/managers",
    {
      method: "GET",
      query: { page, size, q: q || undefined, role: filters.role, linked: filters.linked, assigned_today: filters.assignedToday },
    },
  );
  // counts 는 서버가 안 주면 null
  return { ...raw, items: raw.items.map(toManager), counts: raw.counts ?? null };
};

const toRawUpsert = (request: ManagerUpsertRequestTypes) => ({
  name: request.name,
  phone: request.phone,
  role: request.role,
  work_hours: request.workHours,
});

// POST /staff/managers (MGR-02) — 등록.
export const createManager = async (request: ManagerUpsertRequestTypes): Promise<ManagerItemResponseTypes> => {
  const raw = await apiFetch<WireManager>("/staff/managers", { method: "POST", body: toRawUpsert(request) });
  return toManager(raw);
};

// PATCH /staff/managers/{id} (MGR-03) — 상세 GET 이 사양에 없어 목록 행 데이터로 폼을 채운다.
export const updateManager = async (
  id: string,
  request: ManagerUpsertRequestTypes,
): Promise<ManagerItemResponseTypes> => {
  const raw = await apiFetch<WireManager>(`/staff/managers/${id}`, { method: "PATCH", body: toRawUpsert(request) });
  return toManager(raw);
};

// DELETE /staff/managers/{id} (MGR-04) — 배치 중이면 409 MANAGER_ASSIGNED. 화면이 그 경계를 그대로 안내한다.
export const deleteManager = async (id: string): Promise<void> => {
  await apiFetch<void>(`/staff/managers/${id}`, { method: "DELETE" });
};
