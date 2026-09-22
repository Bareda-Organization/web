"use client";

import { useEffect, useState } from "react";
import { MapSurface } from "@/features/map";
import type { MapCamera, MapMarker, MapPolyline } from "@/features/map";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner } from "@/shared/ui";
import { getRoutePath } from "../api";
import type { RoutePathResponseTypes } from "../types";
import { StyledMapSurface } from "./RouteMapPanel.styled";

type RouteMapPanelProps = {
  routeId: number;
  // 정차지 추가·삭제·순서 저장 뒤 경로를 다시 불러오게 하는 트리거(RouteStopsPanel 이 저장에
  // 성공할 때마다 올린다) — 값이 바뀔 때마다 재조회한다.
  refreshKey: number;
  // 2026-09-22 — 주소 검색으로 찾은 **아직 반영되지 않은** 지점. 순번 없는 핀으로 찍혀
  // 편성된 정차지(순번 칩)와 한눈에 갈린다.
  draft?: { lat: number; lng: number } | null;
  // 지도의 빈 자리를 눌러 그 좌표로 임시 핀을 옮긴다(정확한 승차 지점 잡기).
  onMapClick?: (point: { lat: number; lng: number }) => void;
};

// ChangeApprovalDetail.tsx 의 cameraForPath 와 같은 방식(bounds-fit 은 features/map 계약에
// 아직 없다) — 좌표 평균으로 카메라를 잡는다.
const DEFAULT_MAP_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

// 지점을 고르는 동안의 배율 — 건물·골목이 갈리는 수준이어야 "그 블록 왼쪽 모퉁이" 를 찍을 수 있다.
const STOP_PICK_MAP_ZOOM = 18;

const cameraFor = (points: { lat: number; lng: number }[]): MapCamera => {
  if (points.length === 0) return DEFAULT_MAP_CAMERA;
  const sum = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length, zoom: DEFAULT_MAP_CAMERA.zoom };
};

// §5.9 GET /staff/routes/{id}/path(R27-B 신설) — 편성의 정차지·도로 경로를 지도에 그린다.
// features/map 을 재사용할 뿐 새 지도 컴포넌트는 만들지 않는다(과업 지시서 제약).
export const RouteMapPanel = ({ routeId, refreshKey, draft, onMapClick }: RouteMapPanelProps) => {
  const [path, setPath] = useState<RoutePathResponseTypes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await getRoutePath(routeId);
        setPath(result);
        setError(null);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "경로를 불러오지 못했습니다");
      }
    })();
  }, [routeId, refreshKey]);

  if (error) return <AlertBanner tone="missed" title={error} />;
  // 편성이 비어 있어도 검색 중인 지점이 있으면 지도를 그린다 — 첫 정차지를 넣는 자리가
  // 곧 빈 편성이라, 여기서 지도를 숨기면 그 화면에서만 위치를 확인할 수 없다.
  if (!path || (path.stops.length === 0 && !draft)) return null;

  // 순번을 핀 안에 넣는다(R27 사용자 지시 — "각 정차지도 표기"). 시드처럼 정차지가 수백
  // 미터 안에 몰리면 원 핀이 한 점으로 겹쳐 아래 목록의 번호와 대응시킬 수단이 없었다.
  const markers: MapMarker[] = path.stops.map((stop) => ({
    id: `stop-${stop.stopId}`,
    lat: stop.lat,
    lng: stop.lng,
    kind: "stop",
    seq: stop.seq,
  }));
  if (draft) {
    markers.push({ id: "draft-stop", lat: draft.lat, lng: draft.lng, kind: "stop", selected: true });
  }
  const polylines: MapPolyline[] =
    path.roadPath.length > 0
      ? [{ id: `route-${routeId}`, points: path.roadPath, kind: "route", approximate: path.fallbackUsed }]
      : [];
  // 검색 중에는 그 지점을 본다 — 노선 전체를 담으면 임시 핀이 점만 해져 "모퉁이인지" 를 못 가른다.
  const camera = draft
    ? { lat: draft.lat, lng: draft.lng, zoom: STOP_PICK_MAP_ZOOM }
    : cameraFor(path.roadPath.length > 0 ? path.roadPath : markers);

  return (
    <StyledMapSurface>
      <MapSurface camera={camera} markers={markers} polylines={polylines} onMapClick={onMapClick} />
    </StyledMapSurface>
  );
};
