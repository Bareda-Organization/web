// features/route 가 다루는 타입 전부 — 고정 노선 편성 · 정차 순서 최적화(§5.9, RTE-01·09,
// A-08) + 확정 노선 경유 지점 지정(§5.15, RTE-10, A-15). 두 절이 이 화면 하나에 묶인다
// (지시서 화면 4 — "고정 노선 편성 · 정차 순서 최적화").
// snake_case ↔ camelCase 변환은 api/*.ts 호출부 경계에서 한 번만 한다.

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type RunDirection = "to_academy" | "from_academy";

export type RouteStop = {
  stopId: string;
  seq: number;
  name: string;
  lat: number;
  lng: number;
  // W7 — §4.3·§5.19 `is_destination`(등원 회차의 마지막 항목, 학원). RTE-01 편성
  // 조회에는 이 필드가 없어(학원 자체를 정차지로 다루지 않는다) 기본값 false.
  isDestination?: boolean;
};

export type RouteListItemResponseTypes = {
  id: string;
  busId: string;
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
  busId: string;
  weekday: Weekday;
  direction: RunDirection;
  name?: string;
  active?: boolean;
  stopIds?: string[];
};

export type LatLng = { lat: number; lng: number };

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

// §5.9 주소 검색(2026-09-22) — **아직 아무것도 만들지 않은** 후보 한 지점.
export type StopSuggestionTypes = {
  // 장소 이름 검색(NAVER API HUB 지역 검색)으로 찾은 후보면 그 이름. 주소 후보면 없다.
  placeName?: string;
  lat: number;
  lng: number;
  displayName: string;
  nearby: NearbyStopTypes[];
};

export type NearbyStopTypes = {
  stopId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceM: number;
};

// PUT /staff/routes/{id}/stops 한 항목(2026-09-23) — `stopId` 가 없으면 새로 만든다. 배열 순서가 정차 순서다.
export type RouteStopSaveItemTypes = {
  stopId?: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
};
