import { apiFetch } from "@/shared/lib/http";
import type {
  StopSearchResultTypes,
  RouteDetailResponseTypes,
  RouteListResponseTypes,
  RouteOptimizeRequestTypes,
  RoutePathResponseTypes,
  RouteStop,
  RouteUpsertRequestTypes,
  RunDirection,
  RunRouteResponseTypes,
  Weekday,
  WaypointCreateRequestTypes,
  WaypointResultResponseTypes,
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
export const optimizeRoute = async (
  id: number,
  request: RouteOptimizeRequestTypes,
): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<RawRouteDetail>(`/staff/routes/${id}/optimize`, {
    method: "POST",
    body: request,
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

/**
 * §5.9 주소 검색 — **조회 전용이다.** 이 호출로는 승하차지가 생기지 않는다(반영은 addRouteStop).
 * 그래서 관계자가 지도에서 지점을 옮기는 동안 잘못 찍힌 승하차지가 남지 않는다.
 */
export const searchStopAddress = async (address: string): Promise<StopSearchResultTypes> => {
  const raw = await apiFetch<RawStopSearch>(`/staff/stops/search?address=${encodeURIComponent(address)}`, {
    method: "GET",
  });
  return {
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
  };
};

/** §5.9 좌표로 정차지 추가 — 노선 맨 끝에 붙는다. 여기서 비로소 승하차지가 생긴다. */
export const addRouteStop = async (
  routeId: number,
  request: { lat: number; lng: number; name: string; address?: string },
): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<RawRouteDetail>(`/staff/routes/${routeId}/stops`, {
    method: "POST",
    body: { lat: request.lat, lng: request.lng, name: request.name, address: request.address },
  });
  return toDetail(raw);
};

type RawWaypointPreviewStop = { seq: number; stop_name: string; eta: string | null };
type RawStopRef = { stop_id: number; stop_name: string };

type RawWaypointResult = {
  waypoint_id: number;
  route_preview: {
    stops_before: RawWaypointPreviewStop[];
    stops_after: RawWaypointPreviewStop[];
    reordered: RawStopRef[];
    removed: RawStopRef[];
    road_path_before: RawGeoPoint[];
    road_path_after: RawGeoPoint[];
  };
  est_time_before: string | null;
  est_time_after: string | null;
  est_distance_before: number | null;
  est_distance_after: number | null;
  est_duration_before: number | null;
  est_duration_after: number | null;
  applied: boolean;
};

const toPreviewStop = (raw: RawWaypointPreviewStop) => ({
  seq: raw.seq,
  stopName: raw.stop_name,
  eta: raw.eta,
});

const toStopRef = (raw: RawStopRef) => ({
  stopId: raw.stop_id,
  stopName: raw.stop_name,
});

const toWaypointResult = (raw: RawWaypointResult): WaypointResultResponseTypes => ({
  waypointId: raw.waypoint_id,
  routePreview: {
    stopsBefore: raw.route_preview.stops_before.map(toPreviewStop),
    stopsAfter: raw.route_preview.stops_after.map(toPreviewStop),
    reordered: raw.route_preview.reordered.map(toStopRef),
    removed: raw.route_preview.removed.map(toStopRef),
    roadPathBefore: raw.route_preview.road_path_before,
    roadPathAfter: raw.route_preview.road_path_after,
  },
  estTimeBefore: raw.est_time_before,
  estTimeAfter: raw.est_time_after,
  estDistanceBefore: raw.est_distance_before,
  estDistanceAfter: raw.est_distance_after,
  estDurationBefore: raw.est_duration_before,
  estDurationAfter: raw.est_duration_after,
  applied: raw.applied,
});

// POST /staff/runs/{runId}/waypoints (RTE-10, §5.15) — apply=false 는 미리보기(확정
// 노선 불변), apply=true 는 배포(기사·동승자 푸시). 운행 시작 후 403 CHANGE_WINDOW_CLOSED.
export const addRunWaypoint = async (
  runId: number,
  request: WaypointCreateRequestTypes,
): Promise<WaypointResultResponseTypes> => {
  const raw = await apiFetch<RawWaypointResult>(`/staff/runs/${runId}/waypoints`, {
    method: "POST",
    body: {
      address: request.address,
      lat: request.lat,
      lng: request.lng,
      label: request.label,
      note: request.note,
      seq: request.seq,
      apply: request.apply,
    },
  });
  return toWaypointResult(raw);
};

// DELETE /staff/runs/{runId}/waypoints/{waypointId}?apply= — 배포된 경유 지점만 대상.
export const removeRunWaypoint = async (
  runId: number,
  waypointId: number,
  apply: boolean,
): Promise<WaypointResultResponseTypes> => {
  const raw = await apiFetch<RawWaypointResult>(`/staff/runs/${runId}/waypoints/${waypointId}`, {
    method: "DELETE",
    query: { apply },
  });
  return toWaypointResult(raw);
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
