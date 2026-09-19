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
// 를 직접 import 하지 않는다(기능끼리 서로 import 하지 않는다, `frontend/CONVENTIONS.md`
// "디렉터리"). 이 파일의 산출물(`MapPolyline`·`MapMarker`)이 map 소유라 map 쪽에 둔다.
import type { MapMarker, MapPolyline } from "./types";

type RouteQueryResult = {
  roadPath: { lat: number; lng: number }[];
  fallbackUsed: boolean;
  stops: { stopId: number; lat: number; lng: number }[];
};

export type RouteDisplayState = {
  polylines: MapPolyline[];
  fallback: boolean;
  missing: boolean;
  stopMarkers: MapMarker[];
};

export const buildRouteDisplayState = (runId: number, route: RouteQueryResult): RouteDisplayState => {
  const hasRoute = route.roadPath.length > 0;
  return {
    polylines: hasRoute ? [{ id: `route-${runId}`, points: route.roadPath, kind: "route" }] : [],
    fallback: hasRoute && route.fallbackUsed,
    missing: !hasRoute,
    stopMarkers: route.stops.map((stop) => ({ id: `stop-${stop.stopId}`, lat: stop.lat, lng: stop.lng, kind: "stop" as const })),
  };
};
