// `features/map` 의 계약 타입 — `F4-B` `COMMON-B1.md §2` 가 세 제품(웹 · Flutter 앱 2종)
// 전체에 고정한 이름과 인자를 그대로 따른다. 화면(features/admin·features/run)은 이
// 타입만 알고 SDK 타입(`naver.maps.*`)은 모른다 — `IMPLEMENTATION_PLAN.md §8.3.1`.
// R22 목표 2 — `origin`·`destination` 은 노선의 양 끝이다(사용자 지시 — 출발지·목적지가
// 지도에 안 보인다). 등원은 첫 승차지 → 학원, 하원은 학원 → 마지막 하차지이고(Ruling 190),
// 학원 쪽 끝은 `stops[]` 에 없어 지금까지 어떤 마커로도 안 그려졌다.
// R39 Ruling 400 — "waypoint" 는 강제 경유 지점(§5.15)이다. 승하차지와 모양이 다른 번호 없는 칩 +
// "경유" 글자로 그린다 — 태울 학생이 없는 지점이라 번호를 세지 않는다.
export type MapMarkerKind = "bus" | "stop" | "student" | "origin" | "destination" | "waypoint";

export type MapCamera = {
  lat: number;
  lng: number;
  zoom: number;
};

// R21-A 목표 3 — 등원·하원 구별. 색은 C-09 4색 고정이라 새로 만들 수 없어(사용자 지시)
// 모양(버스 아이콘 형태)으로 가른다. 정차지·학생은 방향 개념이 없어 항상 undefined.
export type MapMarkerDirection = "to_academy" | "from_academy";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: MapMarkerKind;
  // R21-A 목표 1 — 고른 버스만 지도 위에서 다르게 보인다(흰 테두리). 버스가 아닌
  // 마커에는 의미가 없어 항상 undefined.
  selected?: boolean;
  // R21-A 목표 2 — 버스끼리 구별하려고 마커에 직접 번호를 표기한다.
  busNo?: string;
  direction?: MapMarkerDirection;
  // W2-01 — 비상을 발신한 회차의 버스를 지도에서 강조한다(관제 화면이 켠다). 버스 칩의
  // 테두리만 붉게 바뀌고 버스 색은 그대로다. 번호 칩(`busNo` 가 있는 버스)에만 뜻이 있다.
  emergency?: boolean;
  // R27 사용자 지시 — 고정 노선 편성 지도에서 "각 정차지를 표기" 한다. 정차지가 가까이
  // 붙어 있으면 원 핀만으로는 어느 것이 몇 번째인지 알 수 없다. 정차지에만 뜻이 있다.
  seq?: number;
  // R39 Ruling 400 — 오늘 서지 않는 승하차지(`change=skipped`, C-05). 흐리게 + 번호 취소선으로 그린다.
  // 명단의 빨강 취소선과 같은 뜻이다. 정차지에만 뜻이 있다.
  skipped?: boolean;
  // 2026-09-23 사용자 지시 — 마우스로 끌어 자리를 정한다(고정 노선 편성의 승하차지). 끝나면
  // `MapSurface.onMarkerDragEnd` 가 새 좌표를 받는다.
  draggable?: boolean;
};

// R15-T2 — 버스를 고르면 그 노선을 지도에 그리는 데 쓴다(§5.19 road_path). `kind`
// 는 지금은 "route" 하나뿐이지만, 화면이 SDK 타입을 몰라야 한다는 경계(mapAdapterBoundary)
// 를 지키려면 폴리라인도 마커처럼 종류로 구분하는 형태를 미리 열어 둔다.
//
// R20-C 목표 3 — "route" 는 그대로 두고(features/approval 의 전/후 경로 미리보기가
// 이미 이 값을 쓴다, 보고서 §2) 회차 상태 3종을 더한다.
// Ruling 321 — "planned" 은 idle 회차의 고정 노선 기반 "예정" 경로다. 확정 시점에
// 그날 명단으로 다시 계산돼 달라질 수 있어 확정 경로 3종과 색을 다르게 한다.
export type MapPolylineKind = "route" | "confirmed" | "moving" | "finished" | "planned";

export type MapPolyline = {
  id: string;
  points: { lat: number; lng: number }[];
  kind: MapPolylineKind;
  // R20-C 목표 5 — 근사 경로(직선 보간)임을 선 자체(대시)로 알린다. 안내문을 지도
  // 밖 아래에 작게 두면 못 보고 "길이 아닌 곳을 지난다"로 오인한다(사용자 지적).
  approximate?: boolean;
};
