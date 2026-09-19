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
// 네이버 zoom 은 1 증가 시 축척 절반(과제 명시) — zoom 16 = 축척 100m 이 실측 앵커다
// (위 옛 주석). 이 화면은 선택된 버스 좌표를 정중앙에 두므로(`cameraForSelectedBus`),
// 버스가 노선 한쪽 끝(정차지 1)에 있을 때도 반대쪽 끝(정차지 4)까지 426m 를 커버해야
// 한다 — 축척을 "중심에서 화면 끝까지 보이는 대략적 거리"로 보수적으로 잡고, 426m
// 에 여유를 더해 zoom 13(축척 800m ≈ 100m × 2^(16-13))을 쓴다:
//   zoom 15=200m · zoom 14=400m(426m 에 못 미쳐 위험) · zoom 13=800m(≈2배 여유)
// ⚠ 이 계산은 실제 네이버 SDK 축척-화면폭 대응을 직접 렌더링해 눈으로 재지 못한 채
// (Chrome 확장 미연결, 보고서 §2) 앵커 주석 하나에 기댄 값이다 — 조율자가 실제
// 화면에서 여전히 타이트하면 zoom 12(1600m)로 한 단계 더 낮춰야 한다.
export const SELECTED_BUS_MAP_ZOOM = 13;

// 선택된 버스 마커가 있으면 그 좌표로 확대하고, 없으면 화면이 준 기본값을 쓴다.
export const cameraForSelectedBus = (
  marker: Pick<MapMarker, "lat" | "lng"> | null,
  fallback: MapCamera,
): MapCamera => (marker ? { lat: marker.lat, lng: marker.lng, zoom: SELECTED_BUS_MAP_ZOOM } : fallback);
