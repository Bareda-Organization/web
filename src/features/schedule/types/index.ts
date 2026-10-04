// features/schedule 가 다루는 타입 전부 — 운행 스케줄 · 일일 회차(§5.10, SCH-01~03, A-09).
// snake_case ↔ camelCase 변환은 다른 기능과 같은 관례로 api/*.ts 호출부 경계에서 한 번만 한다.
//
// direction·weekday 는 features/run 에도 같은 성격의 값이 있으나(§2 확신 없는 지점 —
// 다른 목록은 그쪽을 참조하지 않고 각자 로컬로 둔다, emergency.direction 과 같은 전례),
// 기능 경계를 좁게 두는 기존 관례를 따라 이 파일에서 독립적으로 정의한다.

export type ScheduleWeekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type ScheduleDirection = "to_academy" | "from_academy";
export type RunStatus = "idle" | "confirmed" | "moving" | "finished";

export type ScheduleItemResponseTypes = {
  id: string;
  busId: string;
  busNo: string;
  weekday: ScheduleWeekday;
  direction: ScheduleDirection;
  departTime: string;
  originName: string;
  destinationName: string;
  estDurationMin: number | null;
  active: boolean;
  // Ruling 818 — 같은 차량·요일·방향 편성(§5.9)의 정차지 수. 편성이 없으면 null, 빈 편성이면 0. 서버가 아직 안 주면 없다.
  routeStopCount?: number | null;
};

export type ScheduleListResponseTypes = {
  items: ScheduleItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

// POST·PATCH /staff/schedules 공용 요청 — PATCH 는 보낸 필드만 고친다(부분 갱신).
export type ScheduleUpsertRequestTypes = {
  busId: string;
  weekday: ScheduleWeekday;
  direction: ScheduleDirection;
  departTime: string;
  originName: string;
  destinationName: string;
  // 선택 항목: 키 없음(undefined) = 유지, `null` = 지움(수정 전용, Ruling 390).
  estDurationMin?: number | null;
  active?: boolean;
};

export type RunAssignmentEntryResponseTypes = {
  managerId: string;
  name: string;
  role: "driver" | "escort";
};

// GET /staff/runs?service_date= 응답 항목 — schedule_id 가 null 이면 임시 회차(§5.10 표시 규약).
export type RunItemResponseTypes = {
  id: string;
  busId: string;
  busNo: string;
  scheduleId: string | null;
  serviceDate: string;
  direction: ScheduleDirection;
  departTime: string;
  confirmAt: string;
  status: RunStatus;
  originName: string;
  destinationName: string;
  estDurationMin: number | null;
  canceledAt: string | null;
  // W4 — 확정 배치의 연속 실패 횟수, 성공 시 0(`API_SPEC §5.10`).
  consecutiveFailures: number;
  assignments: RunAssignmentEntryResponseTypes[];
};

// §5.10 은 이 목록을 §1.8 페이징 표로 안 적었다(스케줄 목록만 "§1.8 페이징" 이라
// 명시) — 직접 curl 로 실측 확인: 응답이 맨 배열이고 page·size·total_count·has_next
// 필드가 없다. 화면·barrel 일관성을 위해 { items } 로 감싼다(api/index.ts 참고).
export type RunListResponseTypes = {
  items: RunItemResponseTypes[];
};

// POST /staff/runs(SCH-03, 임시 추가) 요청.
export type RunCreateRequestTypes = {
  busId: string;
  serviceDate: string;
  direction: ScheduleDirection;
  departTime: string;
  originName: string;
  destinationName: string;
  estDurationMin?: number;
};
