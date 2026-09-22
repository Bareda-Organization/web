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

// §5.5 상세 정차지 한 자리 — RouteStop(고정 노선 편성)과 달리 stop_id·lat·lng 가 없다(정차
// 순서·이름·도착예정만 있는 축약형, PreviewStopResponse.java 확인). eta 는 "전" 목록에서는
// 기록된 도착 실측이 없으면 null 이다(§5.15, R14-T3 실측 — curl 로 직접 확인, 보고서 §1).
export type WaypointPreviewStop = {
  seq: number;
  stopName: string;
  eta: string | null;
};

// reordered·removed 한 자리 — 무엇이 바뀌었는지만 가리킨다(StopRefResponse.java, seq·eta 는
// stopsBefore·After 쪽에 이미 있다).
export type StopRef = {
  stopId: number;
  stopName: string;
};

// §5.15 POST/DELETE /staff/runs/{runId}/waypoints 공용 응답 — 미리보기·배포 결과 대조.
// roadPathBefore·roadPathAfter(`R18-C2`, Ruling 319) — §5.5 상세와 같은 이유로 §5.15 도
// 지도용 전/후 도로 좌표를 싣는다(API_SPEC §5.15 응답).
export type WaypointRoutePreview = {
  stopsBefore: WaypointPreviewStop[];
  stopsAfter: WaypointPreviewStop[];
  reordered: StopRef[];
  removed: StopRef[];
  roadPathBefore: LatLng[];
  roadPathAfter: LatLng[];
};

// estTimeBefore·After 는 지속시간이 아니라 마지막 정차지 도착예정 시각(ISO, WaypointResponse.java
// 의 OffsetDateTime)이다 — R14-T3 실측 전에는 curl 로 확인하지 못해 number 로 잘못 적혀 있었다
// (보고서 §1). "전" 쪽은 기록된 도착 실측이 없으면 null.
// estDurationBefore·After(분, `R18-C2`, Ruling 318) — 노선 전체 소요. §5.5 상세와 같은 값 출처
// (route_version.est_duration_min · 재최적화 계산 결과)를 그대로 싣는다.
export type WaypointResultResponseTypes = {
  waypointId: number;
  routePreview: WaypointRoutePreview;
  estTimeBefore: string | null;
  estTimeAfter: string | null;
  estDistanceBefore: number | null;
  estDistanceAfter: number | null;
  estDurationBefore: number | null;
  estDurationAfter: number | null;
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

// GET /staff/runs/{runId}/route(§5.19, RTE-02) — R15-T2 는 지도에 그릴 도로 경로 좌표를
// 쓰고, R19 목표 1 이 정차지 마커용 stops 를 더한다(R15-T1 이 같이 만드는 고정 계약,
// `IMPLEMENTATION_PLAN.md §8.23`). 응답에는 이 화면이 안 쓰는 필드(currentStop·ack 등)도
// 더 있지만 여기서는 옮기지 않는다 — 필요해지면 그때 추가한다(YAGNI).
// Ruling 321 — 확정 전(idle) 회차도 고정 노선 기반 "예정" 경로를 보여준다. 백엔드
// (r20-a) 가 이 필드로 확정 여부를 알린다 — 화면은 "예정"과 "확정"을 반드시
// 구별해 보여줘야 한다(예정은 확정 시점에 재계산돼 달라질 수 있다). 아직 이 필드를
// 안 보내는 옛 백엔드와의 호환을 위해 파싱 쪽(features/route/api)에서 기본값 true 를 둔다.
export type RunRouteResponseTypes = {
  roadPath: LatLng[];
  fallbackUsed: boolean;
  stops: RouteStop[];
  confirmed: boolean;
};

// GET /staff/routes/{id}/path(§5.9 신설, R27-B) — 편성 상세와 같은 stops 모양에 도로
// 경로를 더한다. §5.19 RunRouteResponseTypes 와 달리 idle/confirmed 구별이 없다 —
// 이 엔드포인트가 다루는 것은 확정 노선이 아니라 학기 단위 원본 편성이라 애초에
// "확정 여부"라는 축이 없다.
export type RoutePathResponseTypes = {
  roadPath: LatLng[];
  fallbackUsed: boolean;
  stops: RouteStop[];
};
