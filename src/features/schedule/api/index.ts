import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  RunAssignmentEntryResponseTypes,
  RunCreateRequestTypes,
  RunItemResponseTypes,
  RunListResponseTypes,
  ScheduleItemResponseTypes,
  ScheduleListResponseTypes,
  ScheduleUpsertRequestTypes,
} from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열.
type WireSchedule = WithId<ScheduleItemResponseTypes, "id" | "busId">;
type WireRun = Omit<RunItemResponseTypes, "id" | "busId" | "scheduleId" | "assignments"> & {
  id: string | number;
  busId: string | number;
  scheduleId: string | number | null;
  assignments: WithId<RunAssignmentEntryResponseTypes, "managerId">[];
};

const toSchedule = (raw: WireSchedule): ScheduleItemResponseTypes => ({
  ...raw,
  id: asIdString(raw.id),
  busId: asIdString(raw.busId),
});

const toRun = (raw: WireRun): RunItemResponseTypes => ({
  ...raw,
  id: asIdString(raw.id),
  busId: asIdString(raw.busId),
  scheduleId: raw.scheduleId == null ? null : asIdString(raw.scheduleId),
  assignments: raw.assignments.map((entry) => ({ ...entry, managerId: asIdString(entry.managerId) })),
});

const toRawScheduleUpsert = (request: ScheduleUpsertRequestTypes) => ({
  bus_id: request.busId,
  weekday: request.weekday,
  direction: request.direction,
  depart_time: request.departTime,
  origin_name: request.originName,
  destination_name: request.destinationName,
  est_duration_min: request.estDurationMin,
  active: request.active,
});

// GET /staff/schedules(SCH-01, §1.8 페이징) — 정규 스케줄 목록.
export const getSchedules = async (page: number, size = 20): Promise<ScheduleListResponseTypes> => {
  const raw = await apiFetch<Omit<ScheduleListResponseTypes, "items"> & { items: WireSchedule[] }>("/staff/schedules", {
    method: "GET",
    query: { page, size },
  });
  return { ...raw, items: raw.items.map(toSchedule) };
};

// POST /staff/schedules(SCH-01) — 등록. 409 DUPLICATE_SCHEDULE · 404 BUS_NOT_FOUND 는 호출부가 ApiError 로 받는다.
export const createSchedule = async (request: ScheduleUpsertRequestTypes): Promise<ScheduleItemResponseTypes> => {
  const raw = await apiFetch<WireSchedule>("/staff/schedules", { method: "POST", body: toRawScheduleUpsert(request) });
  return toSchedule(raw);
};

// PATCH /staff/schedules/{id}(SCH-01) — 보낸 필드만 고친다(부분 갱신, §5.10 본문).
export const updateSchedule = async (
  id: string,
  request: Partial<ScheduleUpsertRequestTypes>,
): Promise<ScheduleItemResponseTypes> => {
  const raw = await apiFetch<WireSchedule>(`/staff/schedules/${id}`, {
    method: "PATCH",
    body: toRawScheduleUpsert(request as ScheduleUpsertRequestTypes),
  });
  return toSchedule(raw);
};

// DELETE /staff/schedules/{id}(SCH-01) — 행을 지운다(soft delete 부재, §5.10 본문).
// 이미 만들어진 회차는 run.schedule_id 가 NULL 로 남는다(ERD FK SET NULL).
export const deleteSchedule = async (id: string): Promise<void> => {
  await apiFetch<void>(`/staff/schedules/${id}`, { method: "DELETE" });
};

// GET /staff/runs?service_date=(SCH-02) — 응답은 맨 배열 봉투,
// §1.8 페이징 필드 부재. 화면·barrel 일관성을 위해 { items } 로 감싼다.
export const getRuns = async (serviceDate?: string): Promise<RunListResponseTypes> => {
  const raw = await apiFetch<WireRun[]>("/staff/runs", { method: "GET", query: { service_date: serviceDate } });
  return { items: raw.map(toRun) };
};

const toRawRunCreate = (request: RunCreateRequestTypes) => ({
  bus_id: request.busId,
  service_date: request.serviceDate,
  direction: request.direction,
  depart_time: request.departTime,
  origin_name: request.originName,
  destination_name: request.destinationName,
  est_duration_min: request.estDurationMin,
});

// POST /staff/runs(SCH-03, 임시 추가) — 만들어진 회차는 schedule_id 가 null(실측 확인,
// 정규 스케줄 유래 회차와 가르는 유일한 표시).
export const createRun = async (request: RunCreateRequestTypes): Promise<RunItemResponseTypes> => {
  const raw = await apiFetch<WireRun>("/staff/runs", { method: "POST", body: toRawRunCreate(request) });
  return toRun(raw);
};

// DELETE /staff/runs/{id}(SCH-03, 임시 취소) — 행을 지우지 않고 canceled_at 을 채운다
// (실측 확인: 취소 후 재조회에도 행이 남고 canceled_at 만 채워짐, status 는 그대로).
export const cancelRun = async (id: string): Promise<void> => {
  await apiFetch<void>(`/staff/runs/${id}`, { method: "DELETE" });
};
