// 세 화면(MonitoringPage·DashboardPage·TodayRunPage)이 "버스를 고르면
// 정중앙 + 확대" 를 같은 수치로 한다. 화면마다 상수를 복사하면 한 화면만 고치는
// 사본이 생기므로, 화면들이 공유하는 `features/map` 표면에 둔다.
import type { MapCamera, MapMarker } from "./types";

// zoom 16(정차지 1~2개만 보이는 "동네" 단위)은 노선 전체가 화면 밖으로 나간다.
// 시드 노선(academy_id=1, V2__seed_data.sql 정차지 1~4)의 좌표 범위와 거리:
//   위도 37.5665~37.5695(Δ0.0030°) · 경도 126.978~126.981(Δ0.0030°)
//   Δ위도 ≈ 0.0030° × 111,320m/° ≈ 334m(남북)
//   Δ경도 ≈ 0.0030° × 111,320m/° × cos(37.57°)(≈0.7927) ≈ 265m(동서)
//   대각선(정차지 1→4 직선거리) ≈ √(334²+265²) ≈ 426m
// 축척 바는 화면 중심에서 끝까지가 아니라 지도 위에 얹히는 짧은 자다. 배율이 낮으면
// 정차지 4곳이 한 점으로 뭉친다. 아래는 네이버 SDK 화면을 띄워 눈으로 잰 두 점이다
// (puppeteer-core + 설치된 Chrome, `/dashboard` 에서 버스 선택):
//   zoom 16 → 축척 바 100m  · 노선이 화면 밖으로 나감 (너무 좁다)
//   zoom 13 → 축척 바 1000m · 정차지 4곳이 한 점으로 뭉침 (너무 넓다)
// 노선 대각선 426m 가 화면의 1/3~1/2 를 차지하면 정차지가 서로 구별되면서 전체가 보인다.
// ⚠ 이 값은 **눈으로만 판정할 수 있다** — 화면을 열지 않고 바꾸지 마라.
// 다만 **숫자를 바꾸면 검사가 잡는다**: 세 화면 검사(`MonitoringPage`·`DashboardPage`·
// `TodayRunPage`)가 `camera: { …, zoom: 15 }` 로 값을 못 박고 있어, 바꾸면 3건이
// 실패한다. 그 실패는 결함이 아니라 **"눈으로 확인했는가" 를 묻는 관문**이다.
// 화면을 보고 바꿨다면 검사도 함께 고쳐라.
// 축척 기준: **"지도에 100m 라고 나오는 정도"**.
// 위 실측표의 zoom 16 이 그 자리다(축척 바 100m). 노선 담기는 `fitBounds` 가 따로 하므로,
// 이 상수는 "고른 버스를 얼마나 가까이 볼 것인가" 만 뜻한다.
// ⚠ 이 값은 **눈으로만 판정할 수 있다** — 화면을 열지 않고 바꾸지 마라(위 경고 그대로).
export const SELECTED_BUS_MAP_ZOOM = 16;

// 선택된 버스 마커가 있으면 그 좌표로 확대하고, 없으면 화면이 준 기본값을 쓴다.
export const cameraForSelectedBus = (
  marker: Pick<MapMarker, "lat" | "lng"> | null,
  fallback: MapCamera,
): MapCamera => (marker ? { lat: marker.lat, lng: marker.lng, zoom: SELECTED_BUS_MAP_ZOOM } : fallback);

// 실시간 위치가 없는 회차(idle·확정·종료)는 `mapMarkers` 에 버스 마커가 없어
// (위치 없는 회차는 버스 마커를 안 만든다) `cameraForSelectedBus` 가 기본 좌표(서울 시청 등)로 빠진다.
// 정차지 마커는 그려지므로, 실시간 위치가 없으면 정차지들의 평균 좌표를 카메라 중심 후보로 대신 쓴다
// (백엔드는 4종 상태 전부 stops 를 채워 보낸다, `/staff/runs/{runId}/route`).
export const anchorForSelection = (
  liveBusMarker: Pick<MapMarker, "lat" | "lng"> | null,
  stopMarkers: Pick<MapMarker, "lat" | "lng">[],
): Pick<MapMarker, "lat" | "lng"> | null => {
  if (liveBusMarker) return liveBusMarker;
  if (stopMarkers.length === 0) return null;
  const sum = stopMarkers.reduce((acc, marker) => ({ lat: acc.lat + marker.lat, lng: acc.lng + marker.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / stopMarkers.length, lng: sum.lng / stopMarkers.length };
};
