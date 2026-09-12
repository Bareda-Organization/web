// features/bus 가 다루는 타입 전부 — 차량 관리(§5.12, BUS-01~04, A-11).
// snake_case ↔ camelCase 변환은 approval/run 과 같은 관례로 api/*.ts 호출부 경계에서 한 번만 한다.
//
// ⚠ §5.12 절 본문에는 목록 응답의 필드가 명시돼 있지 않다(요청 필드 표만 있음).
// 2026-09-12 curl 로 실측한 결과 목록·응답 모두 기본키가 `bus_id` 가 아니라 `id`(숫자)다.

export type BusItemResponseTypes = {
  id: number;
  busNo: string;
  plateNo: string;
  capacity: number;
  /** 응답 전용 — 배차 시 자동 계산 = capacity − 배치된 기사 − 배치된 동승자 */
  studentCapacity: number;
  operable: boolean;
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
