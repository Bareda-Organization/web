// R18-B2 — 세 화면(MonitoringPage·DashboardPage·TodayRunPage)이 "버스를 고르면
// 정중앙 + 확대" 를 같은 수치로 한다. 처음엔 MonitoringPage 안에 상수 하나로만
// 있었는데, 두 화면을 더 고치면서 그대로 복사하면 다음 사람이 하나만 고치는
// 사본이 생긴다 — 그래서 화면들이 공유하는 `features/map` 표면으로 올렸다.
import type { MapCamera, MapMarker } from "./types";

// R19 목표 2 — zoom 16(정차지 1~2개만 보이는 "동네" 단위)은 노선 전체가 화면 밖으로
// 나간다(조율자 눈 확인, R18-B 보고서 §2 는 이 값을 눈으로 확인 못 한 채 넘겼었다).
// 시드 노선(academy_id=1, V2__seed_data.sql 정차지 1~4)의 좌표 범위를 직접 계산했다:
//   위도 37.5665~37.5695(Δ0.0030°) · 경도 126.978~126.981(Δ0.0030°)
//   Δ위도 ≈ 0.0030° × 111,320m/° ≈ 334m(남북)
//   Δ경도 ≈ 0.0030° × 111,320m/° × cos(37.57°)(≈0.7927) ≈ 265m(동서)
//   대각선(정차지 1→4 직선거리) ≈ √(334²+265²) ≈ 426m
// ⚠ 위 계산은 옳았으나 **앵커 해석이 틀렸다** — 축척 바를 "중심에서 화면 끝까지" 로
// 봤는데, 실제로는 지도 위에 얹히는 작은 자이고 화면 폭은 그보다 훨씬 넓다.
// 그래서 zoom 13 은 노선을 담는 것이 아니라 **정차지 4곳이 한 점으로 뭉치는** 배율이
// 됐다. 아래는 조율자가 실제 네이버 SDK 화면을 띄워 눈으로 잰 두 점이다
// (2026-09-19, puppeteer-core + 설치된 Chrome, `/dashboard` 에서 버스 선택):
//   zoom 16 → 축척 바 100m  · 노선이 화면 밖으로 나감 (너무 좁다)
//   zoom 13 → 축척 바 1000m · 정차지 4곳이 한 점으로 뭉침 (너무 넓다)
// 노선 대각선 426m 가 화면의 1/3~1/2 를 차지하면 정차지가 서로 구별되면서 전체가
// 보인다 — 두 실측 점 사이의 zoom 15(축척 바 ≈250m)가 그 자리다.
// ⚠ 이 값은 **눈으로만 판정할 수 있다** — 화면을 열지 않고 바꾸지 마라.
// 다만 **숫자를 바꾸면 검사가 잡는다**: 세 화면 검사(`MonitoringPage`·`DashboardPage`·
// `TodayRunPage`)가 `camera: { …, zoom: 15 }` 로 값을 못 박고 있어, 바꾸면 3건이
// 실패한다(2026-09-19 실측 — 13→15 로 고치다 실제로 걸렸다). 그 실패는 결함이 아니라
// **"눈으로 확인했는가" 를 묻는 관문**이다. 화면을 보고 바꿨다면 검사도 함께 고쳐라.
// R25 목표 2 — 사용자가 축척을 직접 지정했다: **"지도에 100m 라고 나오는 정도"**.
// 위 실측표의 zoom 16 이 그 자리다(축척 바 100m). 예전 값 15(≈250m)는 노선 전체를 담는
// 쪽에 맞춘 값이었는데, 노선 담기는 이제 `fitBounds` 가 따로 하므로 이 상수는 "고른 버스를
// 얼마나 가까이 볼 것인가" 만 뜻한다.
// ⚠ 이 값은 **눈으로만 판정할 수 있다** — 화면을 열지 않고 바꾸지 마라(위 경고 그대로).
export const SELECTED_BUS_MAP_ZOOM = 16;

// 선택된 버스 마커가 있으면 그 좌표로 확대하고, 없으면 화면이 준 기본값을 쓴다.
export const cameraForSelectedBus = (
  marker: Pick<MapMarker, "lat" | "lng"> | null,
  fallback: MapCamera,
): MapCamera => (marker ? { lat: marker.lat, lng: marker.lng, zoom: SELECTED_BUS_MAP_ZOOM } : fallback);

// R21-A 목표 4 — 실시간 위치가 없는 회차(idle·확정·종료)를 고르면 `mapMarkers` 에
// 그 버스 자체가 없어(위치 없는 회차는 버스 마커를 안 만든다) `cameraForSelectedBus`
// 가 항상 기본 좌표(서울 시청 등)로 빠졌다 — 정차지 마커는 실제로 그려지지만
// 카메라가 그쪽으로 옮겨가지 않아 화면 밖에 있는 것과 같았다(조율자 실측 —
// 백엔드는 4종 상태 전부 stops 를 채워 보낸다, `/staff/runs/{runId}/route` 확인).
// 실시간 위치가 없으면 정차지들의 평균 좌표를 카메라 중심 후보로 대신 쓴다.
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
