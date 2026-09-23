import { apiFetch } from "@/shared/lib/http";
import type {
  RouteDetailResponseTypes,
  RouteListResponseTypes,
  RoutePathResponseTypes,
  RouteStop,
  RouteStopSaveItemTypes,
  RouteUpsertRequestTypes,
  RunDirection,
  RunRouteResponseTypes,
  StopSuggestionTypes,
  Weekday,
} from "../types";

type RawRouteStop = { stop_id: number; seq: number; name: string; lat: number; lng: number };

type RawRouteListItem = {
  id: number;
  bus_id: number;
  bus_no: string;
  weekday: Weekday;
  direction: RunDirection;
  name: string | null;
  active: boolean;
};

type RawRouteListResponse = {
  items: RawRouteListItem[];
  page: number;
  size: number;
  total_count: number;
  has_next: boolean;
};

type RawRouteDetail = RawRouteListItem & { stops: RawRouteStop[] };

const toStop = (raw: RawRouteStop): RouteStop => ({
  stopId: raw.stop_id,
  seq: raw.seq,
  name: raw.name,
  lat: raw.lat,
  lng: raw.lng,
});

const toListItem = (raw: RawRouteListItem) => ({
  id: raw.id,
  busId: raw.bus_id,
  busNo: raw.bus_no,
  weekday: raw.weekday,
  direction: raw.direction,
  name: raw.name,
  active: raw.active,
});

const toDetail = (raw: RawRouteDetail): RouteDetailResponseTypes => ({
  ...toListItem(raw),
  stops: raw.stops.map(toStop),
});

// GET /staff/routes (RTE-01, §1.8 페이징) — 비활성 편성도 실린다(편성 이력 보존).
export const getRoutes = async (page: number, size = 20): Promise<RouteListResponseTypes> => {
  const raw = await apiFetch<RawRouteListResponse>("/staff/routes", { method: "GET", query: { page, size } });
  return {
    items: raw.items.map(toListItem),
    page: raw.page,
    size: raw.size,
    totalCount: raw.total_count,
    hasNext: raw.has_next,
  };
};

// GET /staff/routes/{id} — 정차 순서를 seq 차례로 함께 싣는다.
export const getRouteDetail = async (id: number): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<RawRouteDetail>(`/staff/routes/${id}`, { method: "GET" });
  return toDetail(raw);
};

const toBody = (request: RouteUpsertRequestTypes) => ({
  bus_id: request.busId,
  weekday: request.weekday,
  direction: request.direction,
  name: request.name,
  active: request.active,
  stop_ids: request.stopIds,
});

// POST /staff/routes — 201. stop_ids 를 생략하면 정차지 없이 시작한다.
export const createRoute = async (request: RouteUpsertRequestTypes): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<RawRouteDetail>("/staff/routes", { method: "POST", body: toBody(request) });
  return toDetail(raw);
};

// PATCH /staff/routes/{id} — 보낸 필드만 고친다. stop_ids 를 보내면 전체 대체,
// 생략하면 기존 순서를 그대로 둔다(§5.9 "부분 수정 경로를 두지 않는다").
export const updateRoute = async (
  id: number,
  request: Partial<RouteUpsertRequestTypes>,
): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<RawRouteDetail>(`/staff/routes/${id}`, {
    method: "PATCH",
    body: toBody(request as RouteUpsertRequestTypes),
  });
  return toDetail(raw);
};

// DELETE /staff/routes/{id} — 행을 지운다(soft delete 부재). route_stop 은 FK CASCADE.
export const deleteRoute = async (id: number): Promise<void> => {
  await apiFetch<void>(`/staff/routes/${id}`, { method: "DELETE" });
};

// POST /staff/routes/{id}/optimize (RTE-09) — 미리보기 플래그가 없다. 호출 즉시
// 기존 수동 순서를 버리고 커밋한다(§2 판단 근거 — 그래서 화면에 확인 단계를 둔다).
// 기준점은 보내지 않는다 — 서버가 방향 규칙(Ruling 190, 등원은 첫 승차지 → 학원)으로 정한다
// (2026-09-23 사용자 지시 — 위경도 입력칸 제거).
export const optimizeRoute = async (id: number): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<RawRouteDetail>(`/staff/routes/${id}/optimize`, {
    method: "POST",
    body: {},
  });
  return toDetail(raw);
};

type RawRoutePath = { road_path: RawGeoPoint[]; fallback_used: boolean; stops: RawRouteStop[] };

// GET /staff/routes/{id}/path(§5.9 신설, R27-B) — 편성 화면 지도가 그릴 도로 경로.
// stops 는 getRouteDetail 과 같은 RawRouteStop 모양이라 toStop 을 그대로 재사용한다.
export const getRoutePath = async (id: number): Promise<RoutePathResponseTypes> => {
  const raw = await apiFetch<RawRoutePath>(`/staff/routes/${id}/path`, { method: "GET" });
  return {
    roadPath: raw.road_path.map((point) => ({ lat: point.lat, lng: point.lng })),
    fallbackUsed: raw.fallback_used,
    stops: raw.stops.map(toStop),
  };
};

type RawNearbyStop = {
  stop_id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_m: number;
};

type RawStopSearch = { lat: number; lng: number; display_name: string; nearby: RawNearbyStop[] };

const toStopSuggestion = (raw: RawStopSearch): StopSuggestionTypes => ({
  lat: raw.lat,
  lng: raw.lng,
  displayName: raw.display_name,
  nearby: raw.nearby.map((item) => ({
    stopId: item.stop_id,
    name: item.name,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    distanceM: item.distance_m,
  })),
});

/**
 * §5.9 주소 자동완성(2026-09-23 사용자 지시) — 일부만 친 주소로 후보 여럿. **조회 전용이다** —
 * 승하차지는 저장 버튼을 눌러야 생긴다. 후보가 없으면 빈 목록이다(오류 아님).
 */
export const suggestStops = async (query: string): Promise<StopSuggestionTypes[]> => {
  const raw = await apiFetch<{ items: RawStopSearch[] }>(
    `/staff/stops/suggest?query=${encodeURIComponent(query)}`,
    { method: "GET" },
  );
  return raw.items.map(toStopSuggestion);
};

/**
 * §5.9 승하차지 한 번에 저장(2026-09-23 사용자 지시) — 추가·수정·삭제·순서를 한 요청으로.
 * 배열 순서가 정차 순서다. `stopId` 가 없으면 새로 만든다(50m 안 기존 승하차지가 있으면 그것).
 */
export const saveRouteStops = async (
  routeId: number,
  stops: RouteStopSaveItemTypes[],
): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<RawRouteDetail>(`/staff/routes/${routeId}/stops`, {
    method: "PUT",
    body: {
      stops: stops.map((stop) => ({
        stop_id: stop.stopId ?? null,
        name: stop.name,
        address: stop.address ?? null,
        lat: stop.lat,
        lng: stop.lng,
      })),
    },
  });
  return toDetail(raw);
};

type RawGeoPoint = { lat: number; lng: number };

// R15-T1 이 §5.19 응답에 함께 싣는 필드 + R19 목표 1 이 쓰는 stops(§4.3 과 같은 구조를
// §5.19 가 그대로 물려받는다 — `RawRouteStop` 을 재사용한다, 위 `toStop` 참고).
// Ruling 321 — `confirmed` 는 idle 회차의 "예정" 경로를 화면이 구별하게 하는 신호다.
// `?:` 인 이유는 이 필드를 아직 안 보내는 옛 백엔드와의 호환(getRunRoute 기본값 true).
type RawStaffRunRoute = {
  road_path: RawGeoPoint[];
  fallback_used: boolean;
  stops: RawRouteStop[];
  confirmed?: boolean;
};

// GET /staff/runs/{runId}/route(§5.19, RTE-02, R15-T2 목표 4 · R19 목표 1 · Ruling 321) —
// 선택한 버스의 노선(도로 경로)과 정차지를 지도에 그리는 데 쓴다. 이름은
// `IMPLEMENTATION_PLAN.md §8.23` 고정 계약을 그대로 따른다.
export const getRunRoute = async (runId: number): Promise<RunRouteResponseTypes> => {
  const raw = await apiFetch<RawStaffRunRoute>(`/staff/runs/${runId}/route`, { method: "GET" });
  return {
    roadPath: raw.road_path.map((point) => ({ lat: point.lat, lng: point.lng })),
    fallbackUsed: raw.fallback_used,
    stops: raw.stops.map(toStop),
    // 옛 백엔드(필드 부재)는 지금까지 confirmed·moving·finished 회차의 실제 확정
    // 경로만 돌려줬으므로 기본값 true 가 기존 동작을 그대로 보존한다.
    confirmed: raw.confirmed ?? true,
  };
};
