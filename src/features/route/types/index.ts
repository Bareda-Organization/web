// features/route 가 다루는 타입 전부 — 고정 노선 편성 · 정차 순서 최적화(§5.9, RTE-01·09,
// A-08) + 확정 노선 경유 지점 지정(§5.15, RTE-10, A-15). 두 절이 이 화면 하나에 묶인다
// (지시서 화면 4 — "고정 노선 편성 · 정차 순서 최적화").
// snake_case ↔ camelCase 변환은 api/*.ts 호출부 경계에서 한 번만 한다.

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type RunDirection = "to_academy" | "from_academy";

export type RouteStop = {
  stopId: number;
  seq: number;
  name: string;
  lat: number;
  lng: number;
};

export type RouteListItemResponseTypes = {
  id: number;
  busId: number;
  busNo: string;
  weekday: Weekday;
  direction: RunDirection;
  name: string | null;
  active: boolean;
};

export type RouteListResponseTypes = {
  items: RouteListItemResponseTypes[];
  page: number;
  size: number;
  totalCount: number;
  hasNext: boolean;
};

// GET /staff/routes/{id} · POST · PATCH · optimize 응답 — 목록 필드 + stops[].
export type RouteDetailResponseTypes = RouteListItemResponseTypes & {
  stops: RouteStop[];
};

// POST·PATCH /staff/routes 요청 — stop_ids 를 보내면 기존 정차 순서를 전부 대체한다
// (§5.9 "부분 수정 경로를 두지 않는다"). 생략하면(undefined) 기존 순서를 유지.
export type RouteUpsertRequestTypes = {
  busId: number;
  weekday: Weekday;
  direction: RunDirection;
  name?: string;
  active?: boolean;
  stopIds?: number[];
};

export type LatLng = { lat: number; lng: number };

// POST /staff/routes/{id}/optimize 요청 — origin·destination 둘 다 필수(Ruling 184,
// academy·route 어느 쪽에도 좌표 컬럼이 없어 호출자가 넘기는 것이 유일한 선택지).
export type RouteOptimizeRequestTypes = {
  origin: LatLng;
  destination: LatLng;
};

// §5.15 POST/DELETE /staff/runs/{runId}/waypoints 공용 응답 — 미리보기·배포 결과 대조.
export type WaypointRoutePreview = {
  stopsBefore: RouteStop[];
  stopsAfter: RouteStop[];
  reordered: RouteStop[];
};

// ⚠ 단위 미표기 — §5.15 본문이 est_time_before·est_distance_before 의 단위를 명시하지
// 않고, 이 엔드포인트를 실측(curl)하지 못했다(운행 시작 전 실 회차가 필요). 화면은
// 값을 그대로 표시하고 단위를 임의로 붙이지 않는다(보고서 §2, 확신 없는 지점).
export type WaypointResultResponseTypes = {
  waypointId: number;
  routePreview: WaypointRoutePreview;
  estTimeBefore: number;
  estTimeAfter: number;
  estDistanceBefore: number;
  estDistanceAfter: number;
  applied: boolean;
};

// POST /staff/runs/{runId}/waypoints 요청 — address 또는 lat·lng 둘 중 하나는 필수.
export type WaypointCreateRequestTypes = {
  address?: string;
  lat?: number;
  lng?: number;
  label: string;
  note?: string;
  apply: boolean;
};
