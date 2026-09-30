// R18-B2 — 세 화면이 §5.19 노선 응답(getRunRoute)을 지도에 옮기는 규칙을 공유한다.
// R18-B 가 MonitoringPage 에서 먼저 정한 판단 그대로다 — 좌표 0개는 "데이터 부재"
// 안내(`missing`)를 켜고, 근사 경로 안내(`fallback`)는 실제로 뭔가 그려졌을 때만
// 켠다(좌표 0개인데 "근사 경로" 를 띄우는 모순을 막는다).
//
// R19 목표 1 — stops[] 도 같은 규칙으로 세 화면이 공유한다. 지금은 항상 "선택된
// 회차 하나"의 stops 만 들어오므로(호출부가 매번 그 회차 것만 조회) 전 회차가
// 함께 그려질 일이 없다.
//
// `getRunRoute`(features/route)의 반환 형태를 구조적으로만 받는다 — features/route
// 를 직접 import 하지 않는다(기능끼리 서로 import 하지 않는다, `docs/frontend/CONVENTIONS_REACT.md`
// "디렉터리"). 이 파일의 산출물(`MapPolyline`·`MapMarker`)이 map 소유라 map 쪽에 둔다.
import type { MapMarker, MapPolyline, MapPolylineKind } from "./types";

// Ruling 321 — `confirmed` 는 백엔드(§5.19)가 보내는 "이 경로가 확정본인가" 신호다.
// idle 회차도 이제 고정 노선 기반 "예정" 경로를 받을 수 있어, 좌표 유무만으론
// "확정 안 됨"과 "예정도 없음"을 못 가른다.
type RouteQueryResult = {
  roadPath: { lat: number; lng: number }[];
  fallbackUsed: boolean;
  // W7 — `is_destination=true`(등원 회차의 마지막 항목, 학원)은 road_path 끝점
  // (destination 마커)과 같은 자리라 정차지 마커 산출에서 뺀다(`API_SPEC §4.3·§5.19`).
  // R39 Ruling 400 — `isWaypoint`(§4.3·§5.19 `is_waypoint`)는 강제 경유 지점, `change=skipped` 는 오늘 서지 않는 승하차지.
  stops: {
    stopId: string;
    seq: number;
    lat: number;
    lng: number;
    isDestination?: boolean;
    isWaypoint?: boolean;
    change?: "added" | "skipped" | null;
  }[];
  confirmed: boolean;
};

// R20-C 목표 3·4 — `features/run`·`features/admin` 의 `RunStatus` 를 그대로 import
// 하지 않는다(기능끼리 서로 import 하지 않는다, `docs/frontend/CONVENTIONS_REACT.md` "디렉터리").
// 값 집합이 같은 구조적 타입만 여기 둔다.
export type RunStatusForRoute = "idle" | "confirmed" | "moving" | "finished";

const POLYLINE_KIND_BY_STATUS: Partial<Record<RunStatusForRoute, MapPolylineKind>> = {
  confirmed: "confirmed",
  moving: "moving",
  finished: "finished",
};

export type RouteDisplayState = {
  polylines: MapPolyline[];
  fallback: boolean;
  // 확정된 경로인데(route.confirmed) 좌표가 0개 — 실제 데이터 결손.
  missing: boolean;
  // Ruling 321 — 확정 전인데(route.confirmed=false) 고정 노선조차 없어 예정 경로도
  // 못 그린다. 정상 상태 중 하나다(조율자 실측 — 학원 C 처럼 일부러 비워 둔 자리).
  noPlannedRoute: boolean;
  // Ruling 321 — 고정 노선 기반 "예정" 경로가 그려졌다. 확정 시점에 그날 명단으로
  // 다시 계산돼 달라질 수 있다는 안내에 쓴다 — "확정된 경로"로 오인하면 안 된다.
  planned: boolean;
  // 승하차지 마커 + 노선 양 끝(출발지·도착지) 마커. 호출부가 한 덩어리로 지도에
  // 얹었다 지웠다 하므로 따로 내보내지 않는다.
  stopMarkers: MapMarker[];
};

// R22 목표 2 — 출발지·도착지 마커. 백엔드 §5.19 응답에는 `stops[]`(승하차지)만 있고
// 출발지·목적지 필드가 없다 — 대신 `road_path` 자체가 출발지에서 시작해 목적지에서
// 끝나므로(등원 = 첫 승차지 → 학원, 하원 = 학원 → 마지막 하차지, Ruling 190) 그 양 끝을
// 그대로 쓴다. 백엔드 계약을 안 늘리고도 "학원 쪽 끝"이 지도에 나타난다.
//
// 좌표가 2개 미만이면 만들지 않는다 — 한 점뿐이면 출발지와 도착지가 같은 자리라
// 겹쳐 찍히기만 하고 뜻이 없다.
const endpointMarkersOf = (runId: string, roadPath: { lat: number; lng: number }[]): MapMarker[] => {
  if (roadPath.length < 2) return [];
  const first = roadPath[0];
  const last = roadPath[roadPath.length - 1];
  return [
    { id: `origin-${runId}`, lat: first.lat, lng: first.lng, kind: "origin" },
    { id: `destination-${runId}`, lat: last.lat, lng: last.lng, kind: "destination" },
  ];
};

// R39 Ruling 400 — 승하차지 마커와 경유 지점 마커. 서버 `seq` 는 경유 지점 자리를 비운 채 1·3·4 로 오는데
// 명단(§4.2)은 경유 지점을 싣지 않으므로(Ruling 398), 핀 번호는 **경유 지점을 뺀 순번**으로 다시 매겨 명단과 같게 한다.
// 배포 뒤 제거된 경유 지점은 좌표가 null 인 채로 stops[] 에 남는다(§1.13) — 마커를 만들지 않는다.
const stopMarkersOf = (stops: RouteQueryResult["stops"]): MapMarker[] => {
  const markers: MapMarker[] = [];
  let boardingOrder = 0;
  for (const stop of [...stops].sort((a, b) => a.seq - b.seq)) {
    if (stop.isWaypoint) {
      if (stop.lat == null || stop.lng == null) continue;
      markers.push({ id: `waypoint-${stop.stopId}`, lat: stop.lat, lng: stop.lng, kind: "waypoint" });
      continue;
    }
    boardingOrder += 1;
    // 도착지(학원)는 출발·도착 칩이 따로 그린다(W7) — 번호는 세지만 마커는 만들지 않는다.
    if (stop.isDestination) continue;
    markers.push({
      id: `stop-${stop.stopId}`,
      lat: stop.lat,
      lng: stop.lng,
      kind: "stop",
      seq: boardingOrder,
      ...(stop.change === "skipped" ? { skipped: true } : {}),
    });
  }
  return markers;
};

export const buildRouteDisplayState = (
  runId: string,
  runStatus: RunStatusForRoute,
  route: RouteQueryResult,
): RouteDisplayState => {
  const hasRoute = route.roadPath.length > 0;
  // Ruling 321 — 예정 경로는 회차 상태(moving 등)와 무관하게 항상 "planned" 로
  // 그린다. 확정 경로만 회차 상태별 색(POLYLINE_KIND_BY_STATUS)을 쓴다.
  const kind: MapPolylineKind | undefined = !route.confirmed ? "planned" : POLYLINE_KIND_BY_STATUS[runStatus];
  return {
    polylines:
      hasRoute && kind
        ? [{ id: `route-${runId}`, points: route.roadPath, kind, approximate: route.fallbackUsed || !route.confirmed }]
        : [],
    fallback: hasRoute && route.fallbackUsed,
    missing: !hasRoute && route.confirmed,
    noPlannedRoute: !hasRoute && !route.confirmed,
    planned: hasRoute && !route.confirmed,
    stopMarkers: [...stopMarkersOf(route.stops), ...endpointMarkersOf(runId, route.roadPath)],
  };
};
