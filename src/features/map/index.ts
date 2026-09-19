// `features/map` 공개 표면 — 화면(features/admin·features/run)은 이 배럴만 가져온다.
// SDK 타입(`naver.maps.*`)은 어디에도 재노출하지 않는다.
export { MapSurface } from "./MapSurface";
export type { MapSurfaceProps } from "./MapSurface";
export type { MapCamera, MapMarker, MapMarkerKind, MapPolyline, MapPolylineKind } from "./types";
// R18-B2 — 세 화면(MonitoringPage·DashboardPage·TodayRunPage)이 공유하는 카메라·
// 경로 표시 규칙. 화면마다 복사하지 않고 이 표면에서 가져다 쓴다.
export { SELECTED_BUS_MAP_ZOOM, cameraForSelectedBus } from "./selectedBusCamera";
export { buildRouteDisplayState } from "./routeDisplayState";
export type { RouteDisplayState } from "./routeDisplayState";
