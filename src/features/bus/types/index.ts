// features/bus 가 다루는 타입 전부 — 차량 관리(§5.12, BUS-01~04, A-11).
// snake_case ↔ camelCase 변환은 approval/run 과 같은 관례로 api/*.ts 호출부 경계에서 한 번만 한다.
//
// ⚠ §5.12 절 본문에는 목록 응답의 필드가 명시돼 있지 않다(요청 필드 표만 있음).
// 2026-09-12 curl 로 실측한 결과 목록·응답 모두 기본키가 `bus_id` 가 아니라 `id`(숫자)다.

export type BusItemResponseTypes = {
  id: string;
  busNo: string;
  plateNo: string;
  capacity: number;
  /** 응답 전용 — 배차 시 자동 계산 = capacity − 배치된 기사 − 배치된 동승자 */
  studentCapacity: number;
  operable: boolean;
};

// W5 — PATCH 응답 전용 경고(§5.12 `warnings[]`, BR-116). 정원을 줄여 그 차량의
// 오늘 이후 · 미취소 · idle·confirmed 회차 중 배정 인원이 넘치는 회차마다 1건 —
// 저장은 막지 않는다(§5.14 배치 경고와 같은 축).
export type BusCapacityWarningResponseTypes = {
  code: "CAPACITY_BELOW_ASSIGNED";
  runId: string;
  // 어느 회차인지 관리자가 찾게 하는 재료(Ruling 391).
  serviceDate: string;
  departTime: string;
  direction: "to_academy" | "from_academy";
  assignedCount: number;
  studentCapacity: number;
};

// PATCH 전용 — 목록·등록 응답에는 `warnings` 가 없다(§5.12 본문).
export type BusUpdateResponseTypes = BusItemResponseTypes & {
  warnings: BusCapacityWarningResponseTypes[];
};

export type BusListResponseTypes = {
  items: BusItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

// POST /staff/buses · PATCH /staff/buses/{id} 공용 요청 — student_capacity 는 응답 전용이라 요청에 없다.
export type BusUpsertRequestTypes = {
  busNo: string;
  plateNo: string;
  capacity: number;
  operable?: boolean;
};
