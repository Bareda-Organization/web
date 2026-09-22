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
};

// ChangeApprovalDetail.tsx 의 cameraForPath 와 같은 방식(bounds-fit 은 features/map 계약에
// 아직 없다) — 좌표 평균으로 카메라를 잡는다.
const DEFAULT_MAP_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

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
export const RouteMapPanel = ({ routeId, refreshKey }: RouteMapPanelProps) => {
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
  if (!path || path.stops.length === 0) return null;

  // 순번을 핀 안에 넣는다(R27 사용자 지시 — "각 정차지도 표기"). 시드처럼 정차지가 수백
  // 미터 안에 몰리면 원 핀이 한 점으로 겹쳐 아래 목록의 번호와 대응시킬 수단이 없었다.
  const markers: MapMarker[] = path.stops.map((stop) => ({
    id: `stop-${stop.stopId}`,
    lat: stop.lat,
    lng: stop.lng,
    kind: "stop",
    seq: stop.seq,
  }));
  const polylines: MapPolyline[] =
    path.roadPath.length > 0
      ? [{ id: `route-${routeId}`, points: path.roadPath, kind: "route", approximate: path.fallbackUsed }]
      : [];
  const camera = cameraFor(path.roadPath.length > 0 ? path.roadPath : markers);

  return (
    <StyledMapSurface>
      <MapSurface camera={camera} markers={markers} polylines={polylines} />
    </StyledMapSurface>
  );
};
