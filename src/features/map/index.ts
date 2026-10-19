// `features/map` 공개 표면 — 화면(features/admin·features/run)은 이 배럴만 가져온다.
// SDK 타입(`naver.maps.*`)은 어디에도 재노출하지 않는다.
export { MapSurface } from "./MapSurface";
export type { MapSurfaceProps } from "./MapSurface";
export type { MapCamera, MapMarker, MapMarkerDirection, MapMarkerKind, MapPolyline, MapPolylineKind } from "./types";
// 세 화면(MonitoringPage·DashboardPage·TodayRunPage)이 공유하는 카메라·
// 경로 표시 규칙. 화면마다 복사하지 않고 이 표면에서 가져다 쓴다.
// anchorForSelection 도 같은 이유로 세 화면이 공유한다.
export { SELECTED_BUS_MAP_ZOOM, anchorForSelection, cameraForSelectedBus } from "./selectedBusCamera";
export { buildRouteDisplayState } from "./routeDisplayState";
// 고른 버스만 남기는 규칙도 세 화면이 공유한다.
export { visibleMarkers } from "./visibleMarkers";
// 지도 높이는 한 곳에서만 정한다 — 모든 지도 크기를 같은 값으로 맞춘다.
export { MAP_SURFACE_HEIGHT } from "./mapSurfaceSize";
export type { RouteDisplayState, RunStatusForRoute } from "./routeDisplayState";
