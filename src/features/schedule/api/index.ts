import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  RunAssignmentEntryResponseTypes,
  RunCreateRequestTypes,
  RunItemResponseTypes,
  RunListResponseTypes,
  RunStatus,
  ScheduleDirection,
  ScheduleItemResponseTypes,
  ScheduleListResponseTypes,
  ScheduleUpsertRequestTypes,
  ScheduleWeekday,
} from "../types";

type RawSchedule = {
  id: string | number;
  bus_id: string | number;
  bus_no: string;
  weekday: ScheduleWeekday;
  direction: ScheduleDirection;
  depart_time: string;
  origin_name: string;
  destination_name: string;
  est_duration_min: number | null;
  active: boolean;
};

type RawScheduleListResponse = {
  items: RawSchedule[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

type RawRunAssignment = { manager_id: string | number; name: string; role: "driver" | "escort" };

type RawRun = {
  id: string | number;
  bus_id: string | number;
  bus_no: string;
  schedule_id: string | number | null;
  service_date: string;
  direction: ScheduleDirection;
  depart_time: string;
  confirm_at: string;
  status: RunStatus;
  origin_name: string;
  destination_name: string;
  est_duration_min: number | null;
  canceled_at: string | null;
  // W4 — 확정 배치의 연속 실패 횟수, 성공 시 0(`API_SPEC §5.10`). 확정이 계속
  // 실패하는 회차를 골라내는 재료라 강제 확정 화면(`ForceConfirmPage`)과 같은
  // 값 의미를 이 목록에서도 보여준다.
  consecutive_failures: number;
  assignments: RawRunAssignment[];
};

const toSchedule = (raw: RawSchedule): ScheduleItemResponseTypes => ({
  id: asIdString(raw.id),
  busId: asIdString(raw.bus_id),
  busNo: raw.bus_no,
  weekday: raw.weekday,
  direction: raw.direction,
  departTime: raw.depart_time,
  originName: raw.origin_name,
  destinationName: raw.destination_name,
  estDurationMin: raw.est_duration_min,
  active: raw.active,
});

const toAssignment = (raw: RawRunAssignment): RunAssignmentEntryResponseTypes => ({
  managerId: asIdString(raw.manager_id),
  name: raw.name,
  role: raw.role,
});

const toRun = (raw: RawRun): RunItemResponseTypes => ({
  id: asIdString(raw.id),
  busId: asIdString(raw.bus_id),
  busNo: raw.bus_no,
  scheduleId: raw.schedule_id == null ? null : asIdString(raw.schedule_id),
  serviceDate: raw.service_date,
  direction: raw.direction,
  departTime: raw.depart_time,
  confirmAt: raw.confirm_at,
  status: raw.status,
  originName: raw.origin_name,
  destinationName: raw.destination_name,
  estDurationMin: raw.est_duration_min,
  canceledAt: raw.canceled_at,
  consecutiveFailures: raw.consecutive_failures,
  assignments: raw.assignments.map(toAssignment),
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
  const raw = await apiFetch<RawScheduleListResponse>("/staff/schedules", { method: "GET", query: { page, size } });
  return {
    items: raw.items.map(toSchedule),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

// POST /staff/schedules(SCH-01) — 등록. 409 DUPLICATE_SCHEDULE · 404 BUS_NOT_FOUND 는 호출부가 ApiError 로 받는다.
export const createSchedule = async (request: ScheduleUpsertRequestTypes): Promise<ScheduleItemResponseTypes> => {
  const raw = await apiFetch<RawSchedule>("/staff/schedules", { method: "POST", body: toRawScheduleUpsert(request) });
  return toSchedule(raw);
};

// PATCH /staff/schedules/{id}(SCH-01) — 보낸 필드만 고친다(부분 갱신, §5.10 본문).
export const updateSchedule = async (
  id: string,
  request: Partial<ScheduleUpsertRequestTypes>,
): Promise<ScheduleItemResponseTypes> => {
  const raw = await apiFetch<RawSchedule>(`/staff/schedules/${id}`, {
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

// GET /staff/runs?service_date=(SCH-02) — 실측(curl, staffA) 확인: 맨 배열 봉투,
// §1.8 페이징 필드 부재. 화면·barrel 일관성을 위해 { items } 로 감싼다.
export const getRuns = async (serviceDate?: string): Promise<RunListResponseTypes> => {
  const raw = await apiFetch<RawRun[]>("/staff/runs", { method: "GET", query: { service_date: serviceDate } });
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
  const raw = await apiFetch<RawRun>("/staff/runs", { method: "POST", body: toRawRunCreate(request) });
  return toRun(raw);
};

// DELETE /staff/runs/{id}(SCH-03, 임시 취소) — 행을 지우지 않고 canceled_at 을 채운다
// (실측 확인: 취소 후 재조회에도 행이 남고 canceled_at 만 채워짐, status 는 그대로).
export const cancelRun = async (id: string): Promise<void> => {
  await apiFetch<void>(`/staff/runs/${id}`, { method: "DELETE" });
};
