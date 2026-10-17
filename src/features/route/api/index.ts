import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  RouteDetailResponseTypes,
  RouteListResponseTypes,
  RoutePathResponseTypes,
  NearbyStopTypes,
  RouteStop,
  RouteStopSaveItemTypes,
  RouteSummaryTypes,
  RouteUpsertRequestTypes,
  RunRouteResponseTypes,
  StopListItemTypes,
  StopListResponseTypes,
  StopSuggestionTypes,
  StopUpdateRequestTypes,
} from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열. `isDestination` 은 RTE-01(고정 노선 편성) 응답에는 없고 §4.3·§5.19 응답에만 온다.
// isWaypoint · waypointId · change 도 없을 수 있어 아래에서 기본값을 준다.
type WireRouteStop = Omit<RouteStop, "stopId" | "waypointId"> & { stopId: string | number; waypointId?: string | number | null };
type WireRouteDetail = WithId<RouteSummaryTypes, "id" | "busId"> & { stops: WireRouteStop[] };

const toStop = (raw: WireRouteStop): RouteStop => ({
  ...raw,
  stopId: asIdString(raw.stopId),
  isDestination: raw.isDestination ?? false,
  isWaypoint: raw.isWaypoint ?? false,
  waypointId: raw.waypointId == null ? null : asIdString(raw.waypointId),
  change: raw.change ?? null,
});

// 서버 id 는 숫자 — 화면 타입은 문자열.
const toSummary = (raw: WithId<RouteSummaryTypes, "id" | "busId">): RouteSummaryTypes => ({
  ...raw,
  id: asIdString(raw.id),
  busId: asIdString(raw.busId),
});

const toDetail = (raw: WireRouteDetail): RouteDetailResponseTypes => ({
  ...toSummary(raw),
  stops: raw.stops.map(toStop),
});

// GET /staff/routes (RTE-01, §1.8 페이징) — 비활성 편성도 실린다(편성 이력 보존).
export const getRoutes = async (page: number, size = 20): Promise<RouteListResponseTypes> => {
  const raw = await apiFetch<Omit<RouteListResponseTypes, "items"> & { items: (WithId<RouteSummaryTypes, "id" | "busId"> & { stopCount: number })[] }>(
    "/staff/routes",
    { method: "GET", query: { page, size } },
  );
  return { ...raw, items: raw.items.map((item) => ({ ...toSummary(item), stopCount: item.stopCount })) };
};

// GET /staff/routes/{id} — 정차 순서를 seq 차례로 함께 싣는다.
export const getRouteDetail = async (id: string): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<WireRouteDetail>(`/staff/routes/${id}`, { method: "GET" });
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
  const raw = await apiFetch<WireRouteDetail>("/staff/routes", { method: "POST", body: toBody(request) });
  return toDetail(raw);
};

// PATCH /staff/routes/{id} — 보낸 필드만 고친다. stop_ids 를 보내면 전체 대체,
// 생략하면 기존 순서를 그대로 둔다(§5.9 "부분 수정 경로를 두지 않는다").
export const updateRoute = async (
  id: string,
  request: Partial<RouteUpsertRequestTypes>,
): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<WireRouteDetail>(`/staff/routes/${id}`, {
    method: "PATCH",
    body: toBody(request as RouteUpsertRequestTypes),
  });
  return toDetail(raw);
};

// DELETE /staff/routes/{id} — 행을 지운다(soft delete 부재). route_stop 은 FK CASCADE.
export const deleteRoute = async (id: string): Promise<void> => {
  await apiFetch<void>(`/staff/routes/${id}`, { method: "DELETE" });
};

// POST /staff/routes/{id}/optimize (RTE-09) — 미리보기 플래그가 없다. 호출 즉시
// 기존 수동 순서를 버리고 커밋한다(그래서 화면에 확인 단계를 둔다).
// 기준점은 보내지 않는다 — 서버가 방향 규칙(Ruling 190, 등원은 첫 승차지 → 학원)으로 정한다. `fixedStopIds` 는 지금 자리를 지킬 승하차지다(시점·종점·중간 고정).
export const optimizeRoute = async (id: string, fixedStopIds: string[] = []): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<WireRouteDetail>(`/staff/routes/${id}/optimize`, {
    method: "POST",
    body: { fixed_stop_ids: fixedStopIds },
  });
  return toDetail(raw);
};

// GET /staff/routes/{id}/path(§5.9) — 편성 화면 지도가 그릴 도로 경로.
// stops 는 getRouteDetail 과 같은 모양이라 toStop 을 그대로 재사용한다. 거리·소요·계산 시각은 없으면 null.
export const getRoutePath = async (id: string): Promise<RoutePathResponseTypes> => {
  const raw = await apiFetch<Omit<RoutePathResponseTypes, "stops"> & { stops: WireRouteStop[] }>(`/staff/routes/${id}/path`, { method: "GET" });
  return {
    ...raw,
    stops: raw.stops.map(toStop),
    distanceM: raw.distanceM ?? null,
    durationS: raw.durationS ?? null,
    computedAt: raw.computedAt ?? null,
  };
};

// 서버 id 는 숫자 — 화면 타입은 문자열. placeName 은 빈 문자열이면 싣지 않는다.
type WireStopSuggestion = Omit<StopSuggestionTypes, "nearby"> & { nearby: WithId<NearbyStopTypes, "stopId">[] };

const toStopSuggestion = ({ placeName, nearby, ...rest }: WireStopSuggestion): StopSuggestionTypes => ({
  ...rest,
  ...(placeName ? { placeName } : {}),
  nearby: nearby.map((item) => ({ ...item, stopId: asIdString(item.stopId) })),
});

/**
 * §5.9 주소 자동완성 — 일부만 친 주소로 후보 여럿. **조회 전용이다** —
 * 승하차지는 저장 버튼을 눌러야 생긴다. 후보가 없으면 빈 목록이다(오류 아님).
 */
export const suggestStops = async (query: string): Promise<StopSuggestionTypes[]> => {
  const raw = await apiFetch<{ items: WireStopSuggestion[] }>(
    `/staff/stops/suggest?query=${encodeURIComponent(query)}`,
    { method: "GET" },
  );
  return raw.items.map(toStopSuggestion);
};

/**
 * §5.9 승하차지 한 번에 저장 — 추가·수정·삭제·순서를 한 요청으로.
 * 배열 순서가 정차 순서다. `stopId` 가 없으면 새로 만든다(50m 안 기존 승하차지가 있으면 그것).
 */
export const saveRouteStops = async (
  routeId: string,
  stops: RouteStopSaveItemTypes[],
): Promise<RouteDetailResponseTypes> => {
  const raw = await apiFetch<WireRouteDetail>(`/staff/routes/${routeId}/stops`, {
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

// Ruling 321 — `confirmed` 는 idle 회차의 "예정" 경로를 화면이 구별하게 하는 신호다.
// 이 필드를 아직 안 보내는 옛 백엔드는 확정 경로만 돌려줬으므로 기본값은 true 다.
// GET /staff/runs/{runId}/route(§5.19, RTE-02, Ruling 321) — 선택한 버스의 노선(도로 경로)과 정차지를 지도에 그리는 데 쓴다.
export const getRunRoute = async (runId: string): Promise<RunRouteResponseTypes> => {
  const raw = await apiFetch<Omit<RunRouteResponseTypes, "stops" | "confirmed"> & { stops: WireRouteStop[]; confirmed?: boolean }>(
    `/staff/runs/${runId}/route`,
    { method: "GET" },
  );
  return { ...raw, stops: raw.stops.map(toStop), confirmed: raw.confirmed ?? true };
};

// 서버 id 는 숫자 — 화면 타입은 문자열.
type WireStopListItem = Omit<StopListItemTypes, "stopId" | "routes"> & {
  stopId: string | number;
  routes: WithId<StopListItemTypes["routes"][number], "routeId">[];
};

const toStopListItem = (raw: WireStopListItem): StopListItemTypes => ({
  ...raw,
  stopId: asIdString(raw.stopId),
  routes: raw.routes.map((route) => ({ ...route, routeId: asIdString(route.routeId) })),
});

// §1.8 — 페이징 `size` 의 서버 상한.
const STOP_PAGE_SIZE_MAX = 100;

/**
 * GET /staff/stops?q= (§5.9 "승하차지 관리", Ruling 849, A-08) — 학원의 승하차지 목록. §1.8 페이징,
 * `q` 는 이름 또는 주소에 들어 있는 글자(비우면 전부). 정렬은 서버가 이름 오름차순으로 정한다.
 */
export const getStops = async (page: number, size = 20, q?: string): Promise<StopListResponseTypes> => {
  const raw = await apiFetch<Omit<StopListResponseTypes, "items"> & { items: WireStopListItem[] }>(
    "/staff/stops",
    { method: "GET", query: { page, size, q: q || undefined } },
  );
  return { ...raw, items: raw.items.map(toStopListItem) };
};

/**
 * 학원의 승하차지 전부 — 수정 대화상자가 핀을 옮긴 자리의 50m 안 다른 승하차지를 가려내려고 한 번 읽는다(L3).
 * 서버에는 좌표로 묻는 길이 없어 목록을 쪽 단위(상한 100)로 이어 받는다.
 * ponytail: 승하차지가 수천 곳이 되면 쪽 수만큼 왕복 — 그때 `GET /staff/stops` 에 반경 조회를 둔다.
 */
export const getAllStops = async (): Promise<StopListItemTypes[]> => {
  const all: StopListItemTypes[] = [];
  for (let page = 0; ; page += 1) {
    const result = await getStops(page, STOP_PAGE_SIZE_MAX);
    all.push(...result.items);
    if (!result.hasNext) return all;
  }
};

/**
 * PATCH /staff/stops/{id} (§5.9, Ruling 849) — 이름 · 주소 · 좌표 중 **보낸 필드만** 고친다. 그 승하차지를 쓰는 모든
 * 노선의 표시에 함께 반영된다(학생 요일별 주소는 사본이라 불변). 응답은 목록 항목과 같은 형태다.
 */
export const updateStop = async (id: string, request: StopUpdateRequestTypes): Promise<StopListItemTypes> => {
  const raw = await apiFetch<WireStopListItem>(`/staff/stops/${id}`, {
    method: "PATCH",
    body: { name: request.name, address: request.address, lat: request.position?.lat, lng: request.position?.lng },
  });
  return toStopListItem(raw);
};
