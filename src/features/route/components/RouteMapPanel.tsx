"use client";

import { useEffect, useState } from "react";
import { MapSurface } from "@/features/map";
import type { MapCamera, MapMarker, MapPolyline } from "@/features/map";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner } from "@/shared/ui";
import { getRoutePath } from "../api";
import type { RoutePathResponseTypes, RunDirection } from "../types";
import { StyledMapCaption, StyledMapSurface } from "./RouteMapPanel.styled";

type Point = { lat: number; lng: number };

type RouteMapPanelProps = {
  routeId: number;
  direction: RunDirection;
  // 저장·최적화 뒤 경로를 다시 불러오게 하는 트리거 — 값이 바뀔 때마다 재조회한다.
  refreshKey: number;
  /** 저장 전 목록 그대로의 순서 — 핀 번호가 여기서 나온다. */
  stops: (Point & { key: string })[];
  /** 수정 중인 승하차지 — 그 핀만 끌 수 있다. */
  editingKey: string | null;
  /** 추가 중인 자리(아직 목록에 없음) 또는 수정 중인 핀의 현재 자리. */
  pin: Point | null;
  /** 카메라를 옮길 자리 — 후보를 고르거나 수정을 시작할 때만 바뀐다(끌 때마다 되돌아가지 않게). */
  focus: Point | null;
  /** 저장 안 한 변경이 있는가 — 선은 마지막으로 저장된 경로라 그 사실을 알린다. */
  dirty: boolean;
  onPinMove: (point: Point) => void;
};

const DEFAULT_MAP_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

// 자리를 고르는 동안의 배율 — 건물·골목이 갈리는 수준이어야 "그 블록 왼쪽 모퉁이" 를 찍을 수 있다.
const STOP_PICK_MAP_ZOOM = 18;

const DRAFT_MARKER_ID = "draft-stop";

const cameraFor = (points: Point[]): MapCamera => {
  if (points.length === 0) return DEFAULT_MAP_CAMERA;
  const sum = points.reduce((acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length, zoom: DEFAULT_MAP_CAMERA.zoom };
};

/**
 * 시점·종점(2026-09-23 사용자 지시 8 — 다른 지도처럼 여기에도). 방향 규칙은 Ruling 190 이다: 등원은
 * 첫 승차지 → 학원, 하원은 학원 → 마지막 하차지.
 *
 * <p>정차지 쪽 끝은 <b>저장 전 목록</b>에서, 학원 쪽 끝은 저장된 도로 경로의 끝에서 가져온다 — 학원
 * 좌표는 이 화면에 따로 오지 않고 경로의 끝이 곧 학원이다(§5.9 path). 순서를 바꾸면 시점이 바로 따라온다.
 */
const endpointsOf = (direction: RunDirection, stops: Point[], roadPath: Point[]): MapMarker[] => {
  if (stops.length === 0) return [];
  const academy = roadPath.length >= 2 ? (direction === "to_academy" ? roadPath[roadPath.length - 1] : roadPath[0]) : null;
  const stopEnd = direction === "to_academy" ? stops[0] : stops[stops.length - 1];
  const origin = direction === "to_academy" ? stopEnd : academy;
  const destination = direction === "to_academy" ? academy : stopEnd;
  return [
    ...(origin ? [{ id: "origin", lat: origin.lat, lng: origin.lng, kind: "origin" as const }] : []),
    ...(destination ? [{ id: "destination", lat: destination.lat, lng: destination.lng, kind: "destination" as const }] : []),
  ];
};

// §5.9 GET /staff/routes/{id}/path — 편성의 도로 경로. features/map 을 재사용할 뿐 새 지도 컴포넌트는 만들지 않는다.
export const RouteMapPanel = ({
  routeId,
  direction,
  refreshKey,
  stops,
  editingKey,
  pin,
  focus,
  dirty,
  onPinMove,
}: RouteMapPanelProps) => {
  const [path, setPath] = useState<RoutePathResponseTypes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setPath(await getRoutePath(routeId));
        setError(null);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "경로를 불러오지 못했습니다");
      }
    })();
  }, [routeId, refreshKey]);

  const roadPath = path?.roadPath ?? [];
  // 수정 중인 핀은 끄는 대로 따라가야 한다 — 목록의 옛 자리가 아니라 지금 핀 자리로 그린다.
  const placed = stops.map((stop) => (stop.key === editingKey && pin ? { ...stop, ...pin } : stop));
  const markers: MapMarker[] = [
    ...placed.map((stop, index) => ({
      id: `stop-${stop.key}`,
      lat: stop.lat,
      lng: stop.lng,
      kind: "stop" as const,
      seq: index + 1,
      ...(stop.key === editingKey ? { selected: true, draggable: true } : {}),
    })),
    ...(pin && !editingKey
      ? [{ id: DRAFT_MARKER_ID, lat: pin.lat, lng: pin.lng, kind: "stop" as const, selected: true, draggable: true }]
      : []),
    ...endpointsOf(direction, placed, roadPath),
  ];
  const polylines: MapPolyline[] =
    roadPath.length > 0 ? [{ id: `route-${routeId}`, points: roadPath, kind: "route", approximate: path?.fallbackUsed }] : [];
  const camera = focus ? { ...focus, zoom: STOP_PICK_MAP_ZOOM } : cameraFor(roadPath.length > 0 ? roadPath : markers);

  return (
    <div>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
      <StyledMapSurface>
        <MapSurface
          camera={camera}
          markers={markers}
          polylines={polylines}
          fitToContent={!focus}
          onMarkerDragEnd={(markerId, point) => {
            if (markerId === DRAFT_MARKER_ID || markerId === `stop-${editingKey}`) onPinMove(point);
          }}
        />
      </StyledMapSurface>
      {dirty ? <StyledMapCaption>선은 마지막으로 저장한 경로입니다 — 저장하면 새 순서로 다시 그립니다</StyledMapCaption> : null}
    </div>
  );
};
