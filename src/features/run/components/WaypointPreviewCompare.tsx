"use client";

import { MapSurface, type MapCamera, type MapMarker, type MapPolyline } from "@/features/map";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import type { WaypointPreviewStopTypes, WaypointResponseTypes } from "../types";
import {
  StyledCompareColumn,
  StyledCompareGrid,
  StyledCompareRow,
  StyledPreviewMap,
} from "./RunWaypointPanel.styled";

const DEFAULT_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

// 경로 좌표(없으면 마커)의 평균으로 카메라를 잡는다 — 승인 상세(ChangeApprovalDetail)와 같은 방식이다.
// features/approval 은 run 이 읽을 수 없는 기능이라(import 경계) 같은 몇 줄을 여기에 둔다.
const cameraFor = (points: { lat: number; lng: number }[]): MapCamera => {
  if (points.length === 0) return DEFAULT_CAMERA;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length, zoom: DEFAULT_CAMERA.zoom };
};

const markersOf = (stops: WaypointPreviewStopTypes[], changed: Set<string>): MapMarker[] =>
  stops
    .filter((stop) => stop.lat != null && stop.lng != null)
    .map((stop) => ({
      id: `stop-${stop.seq}-${stop.stopName}`,
      lat: stop.lat as number,
      lng: stop.lng as number,
      kind: "stop" as const,
      seq: stop.seq,
      selected: changed.has(stop.stopName),
    }));

const durationText = (before: number | null, after: number | null) => {
  if (before === null || after === null) return "정보가 없어요";
  const delta = after - before;
  return `${before}분 → ${after}분 (${delta >= 0 ? "+" : ""}${delta}분)`;
};

const distanceText = (before: number | null, after: number | null) => {
  if (before === null || after === null) return "정보가 없어요";
  const delta = after - before;
  return `${before.toFixed(1)}km → ${after.toFixed(1)}km (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}km)`;
};

const stopRow = (stop: WaypointPreviewStopTypes) => (
  <StyledCompareRow key={`${stop.seq}-${stop.stopName}`}>
    <span>
      {stop.seq}. {stop.stopName}
    </span>
    <span>{stop.eta ? formatClockTime(stop.eta) : "-"}</span>
  </StyledCompareRow>
);

const routeMap = (path: { lat: number; lng: number }[], markers: MapMarker[]) => {
  if (path.length === 0 && markers.length === 0) return <p>경로 좌표가 아직 없어요</p>;
  const polylines: MapPolyline[] = path.length > 0 ? [{ id: "preview", points: path, kind: "route" }] : [];
  return (
    <StyledPreviewMap>
      <MapSurface camera={cameraFor(path.length > 0 ? path : markers)} markers={markers} polylines={polylines} />
    </StyledPreviewMap>
  );
};

/** §5.15 미리보기의 전후 비교 — 소요시간 · 거리 · 순서가 바뀌는 승하차지 · 승하차지 표 · 전후 지도. */
export const WaypointPreviewCompare = ({ preview }: { preview: WaypointResponseTypes }) => {
  const { routePreview } = preview;
  const changed = new Set(
    [...routePreview.reordered, ...routePreview.removed].map((ref) => ref.stopName).filter((name): name is string => name != null),
  );
  const reorderedNames = routePreview.reordered.map((ref) => ref.stopName).filter(Boolean).join(" · ");
  return (
    <>
      <StyledCompareRow>
        <span>전체 소요시간</span>
        <span>{durationText(preview.estDurationBefore, preview.estDurationAfter)}</span>
      </StyledCompareRow>
      <StyledCompareRow>
        <span>예상 거리</span>
        <span>{distanceText(preview.estDistanceBefore, preview.estDistanceAfter)}</span>
      </StyledCompareRow>
      <StyledCompareRow>
        <span>순서가 바뀌는 승하차지</span>
        <span>{reorderedNames || "없어요"}</span>
      </StyledCompareRow>
      <StyledCompareGrid>
        <StyledCompareColumn>
          <p>변경 전</p>
          {routePreview.stopsBefore.map(stopRow)}
        </StyledCompareColumn>
        <StyledCompareColumn>
          <p>변경 후</p>
          {routePreview.stopsAfter.map(stopRow)}
        </StyledCompareColumn>
        <StyledCompareColumn>
          {routeMap(routePreview.roadPathBefore, markersOf(routePreview.stopsBefore, changed))}
        </StyledCompareColumn>
        <StyledCompareColumn>
          {routeMap(routePreview.roadPathAfter, markersOf(routePreview.stopsAfter, changed))}
        </StyledCompareColumn>
      </StyledCompareGrid>
    </>
  );
};
