// features/manager 가 다루는 타입 전부 — 매니저 관리(§5.13, MGR-01~04, A-12).
// snake_case ↔ camelCase 변환은 api/*.ts 호출부 경계에서 한 번만 한다.
//
// ⚠ §5.13 절 본문도 §5.12 와 같이 목록 응답 필드가 명시돼 있지 않다. 2026-09-12 curl
// 실측 — 기본키는 `manager_id` 가 아니라 `id`(숫자), work_hours 는 요일 키(mon~sun)마다
// {start, end} 배열 또는 미기재 시 null.

export type ManagerRole = "driver" | "escort";

export type WorkHoursRange = { start: string; end: string };

export type WorkHours = Partial<Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", WorkHoursRange[]>>;

export type ManagerItemResponseTypes = {
  id: number;
  name: string;
  phone: string;
  role: ManagerRole;
  workHours: WorkHours | null;
};

export type ManagerListResponseTypes = {
  items: ManagerItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

// POST /staff/managers · PATCH /staff/managers/{id} 공용 요청.
export type ManagerUpsertRequestTypes = {
  name: string;
  phone: string;
  role: ManagerRole;
  workHours?: WorkHours;
};
