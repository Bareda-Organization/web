"use client";

// `features/map` 의 공개 표면 — 화면은 이 파일만 가져다 쓴다. 실제 SDK 연동은
// `./naver/NaverMapSurface` 뒤에 숨어 있고, 지도 공급자를 나중에 바꾸더라도
// (`IMPLEMENTATION_PLAN.md §8.3.1` 이 언급하는 Tmap 전환 가능성) 이 파일의 이름과
// props 는 그대로 두고 내부 구현만 교체하면 된다.
import { NaverMapSurface } from "./naver/NaverMapSurface";
import type { MapCamera, MapMarker, MapPolyline } from "./types";

export type MapSurfaceProps = {
  camera: MapCamera;
  markers: MapMarker[];
  // R23 목표 4 — 지도 위 버스 아이콘을 눌러 고른다. 인자는 `MapMarker.id`(버스는 회차 id).
  onMarkerClick?: (markerId: string) => void;
  // 2026-09-22 — 지도의 빈 자리를 눌러 **좌표 자체**를 고른다(고정 노선 편성의 정차지 위치
  // 미세 조정). 마커를 누른 경우는 `onMarkerClick` 이 받고 여기로는 오지 않는다.
  onMapClick?: (point: { lat: number; lng: number }) => void;
  // 2026-09-23 — `draggable` 마커를 끌어 놓은 자리(핀 끝이 가리키는 좌표).
  onMarkerDragEnd?: (markerId: string, point: { lat: number; lng: number }) => void;
  /** 기본 `true` — 노선·버스 전체를 담는 배율로 맞춘다. `false` 면 `camera` 를 그대로 쓴다. */
  fitToContent?: boolean;
  // R15-T2 — 선택된 버스의 노선(§5.19 road_path). 생략하거나 빈 배열이면 아무것도 그리지 않는다.
  polylines?: MapPolyline[];
  onReady?: () => void;
  onAuthFailed?: (exception: unknown) => void;
  className?: string;
};

export const MapSurface = (props: MapSurfaceProps) => {
  return <NaverMapSurface {...props} />;
};
