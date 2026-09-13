"use client";

// `features/map` 의 공개 표면 — 화면은 이 파일만 가져다 쓴다. 실제 SDK 연동은
// `./naver/NaverMapSurface` 뒤에 숨어 있고, 지도 공급자를 나중에 바꾸더라도
// (`IMPLEMENTATION_PLAN.md §8.3.1` 이 언급하는 Tmap 전환 가능성) 이 파일의 이름과
// props 는 그대로 두고 내부 구현만 교체하면 된다.
import { NaverMapSurface } from "./naver/NaverMapSurface";
import type { MapCamera, MapMarker } from "./types";

export type MapSurfaceProps = {
  camera: MapCamera;
  markers: MapMarker[];
  onReady?: () => void;
  onAuthFailed?: (exception: unknown) => void;
  className?: string;
};

export const MapSurface = (props: MapSurfaceProps) => {
  return <NaverMapSurface {...props} />;
};
