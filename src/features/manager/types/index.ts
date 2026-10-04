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
  id: string;
  name: string;
  phone: string;
  role: ManagerRole;
  workHours: WorkHours | null;
  // 연결된 계정 — 가입 연결 전이면 null. 관리자 경유 비밀번호 초기화(§5.22 · Ruling 329)의 대상.
  accountId: string | null;
  // Ruling 817 — 목록 응답에만. 서버가 아직 안 주면 0 · 빈 목록.
  /** 배치 중인 회차 수 — 0 이 아니면 삭제 · 역할 변경이 409 로 막힌다 */
  assignedRunCount: number;
  /** 오늘 · 내일 미취소 회차의 배치(날짜 · 출발 순) */
  assignments: ManagerAssignmentTypes[];
};

export type ManagerAssignmentTypes = {
  runId: string;
  serviceDate: string;
  busNo: string;
  direction: "to_academy" | "from_academy";
  departTime: string;
  status: "idle" | "confirmed" | "moving" | "finished";
};

/** 재직 매니저의 오늘 배치 유무별 수 — 쿼리 · 쪽과 무관(Ruling 817) */
export type ManagerCountsTypes = { assignedToday: number; unassignedToday: number };

export type ManagerListResponseTypes = {
  items: ManagerItemResponseTypes[];
  /** 서버가 안 주면 null */
  counts: ManagerCountsTypes | null;
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
