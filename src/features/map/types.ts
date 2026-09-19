// `features/map` 의 계약 타입 — `F4-B` `COMMON-B1.md §2` 가 세 제품(웹 · Flutter 앱 2종)
// 전체에 고정한 이름과 인자를 그대로 따른다. 화면(features/admin·features/run)은 이
// 타입만 알고 SDK 타입(`naver.maps.*`)은 모른다 — `IMPLEMENTATION_PLAN.md §8.3.1`.
export type MapMarkerKind = "bus" | "stop" | "student";

export type MapCamera = {
  lat: number;
  lng: number;
  zoom: number;
};

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: MapMarkerKind;
};

// R15-T2 — 버스를 고르면 그 노선을 지도에 그리는 데 쓴다(§5.19 road_path). `kind`
// 는 지금은 "route" 하나뿐이지만, 화면이 SDK 타입을 몰라야 한다는 경계(mapAdapterBoundary)
// 를 지키려면 폴리라인도 마커처럼 종류로 구분하는 형태를 미리 열어 둔다.
//
// R20-C 목표 3 — "route" 는 그대로 두고(features/approval 의 전/후 경로 미리보기가
// 이미 이 값을 쓴다, 보고서 §2) 회차 상태 3종을 더한다 — `idle` 은 노선 자체가
// 없어(routeDisplayState.ts) 선을 그릴 일이 없다.
export type MapPolylineKind = "route" | "confirmed" | "moving" | "finished";

export type MapPolyline = {
  id: string;
  points: { lat: number; lng: number }[];
  kind: MapPolylineKind;
  // R20-C 목표 5 — 근사 경로(직선 보간)임을 선 자체(대시)로 알린다. 안내문을 지도
  // 밖 아래에 작게 두면 못 보고 "길이 아닌 곳을 지난다"로 오인한다(사용자 지적).
  approximate?: boolean;
};
