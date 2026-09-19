// R18-B2 — 세 화면(MonitoringPage·DashboardPage·TodayRunPage)이 "버스를 고르면
// 정중앙 + 확대" 를 같은 수치로 한다. 처음엔 MonitoringPage 안에 상수 하나로만
// 있었는데, 두 화면을 더 고치면서 그대로 복사하면 다음 사람이 하나만 고치는
// 사본이 생긴다 — 그래서 화면들이 공유하는 `features/map` 표면으로 올렸다.
import type { MapCamera, MapMarker } from "./types";

// zoom 16 은 그 버스 주변 정차지 1~2개가 함께 보이는 "동네" 단위 축척이다(R18-B
// 보고서 §2 — 실제 화면으로 눈으로 확인은 아직 못했다, 값 자체는 이번에 안 건드림).
export const SELECTED_BUS_MAP_ZOOM = 16;

// 선택된 버스 마커가 있으면 그 좌표로 확대하고, 없으면 화면이 준 기본값을 쓴다.
export const cameraForSelectedBus = (
  marker: Pick<MapMarker, "lat" | "lng"> | null,
  fallback: MapCamera,
): MapCamera => (marker ? { lat: marker.lat, lng: marker.lng, zoom: SELECTED_BUS_MAP_ZOOM } : fallback);
