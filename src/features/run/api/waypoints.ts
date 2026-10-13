import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WaypointDeleteRequestTypes, WaypointRequestTypes, WaypointResponseTypes } from "../types";

type RawPreviewStop = { seq: number; stop_name: string; eta: string | null; lat: number | null; lng: number | null };
type RawStopRef = { stop_id: string | number; stop_name: string | null };
type RawGeoPoint = { lat: number; lng: number };

type RawWaypointResponse = {
  waypoint_id: string | number | null;
  preview_token: string | null;
  applied: boolean;
  route_preview: {
    stops_before: RawPreviewStop[];
    stops_after: RawPreviewStop[];
    reordered: RawStopRef[];
    removed: RawStopRef[];
    road_path_before: RawGeoPoint[];
    road_path_after: RawGeoPoint[];
  };
  est_duration_before: number | null;
  est_duration_after: number | null;
  est_distance_before: number | null;
  est_distance_after: number | null;
};

const toPreviewStop = (raw: RawPreviewStop) => ({ seq: raw.seq, stopName: raw.stop_name, eta: raw.eta ?? null, lat: raw.lat ?? null, lng: raw.lng ?? null });
const toStopRef = (raw: RawStopRef) => ({ stopId: asIdString(raw.stop_id), stopName: raw.stop_name });
const toPoints = (raw: RawGeoPoint[] | undefined) => (raw ?? []).map((point) => ({ lat: point.lat, lng: point.lng }));

const toWaypointResponse = (raw: RawWaypointResponse): WaypointResponseTypes => ({
  waypointId: raw.waypoint_id == null ? null : asIdString(raw.waypoint_id),
  previewToken: raw.preview_token ?? null,
  applied: raw.applied,
  routePreview: {
    stopsBefore: raw.route_preview.stops_before.map(toPreviewStop),
    stopsAfter: raw.route_preview.stops_after.map(toPreviewStop),
    reordered: raw.route_preview.reordered.map(toStopRef),
    removed: raw.route_preview.removed.map(toStopRef),
    roadPathBefore: toPoints(raw.route_preview.road_path_before),
    roadPathAfter: toPoints(raw.route_preview.road_path_after),
  },
  estDurationBefore: raw.est_duration_before ?? null,
  estDurationAfter: raw.est_duration_after ?? null,
  estDistanceBefore: raw.est_distance_before ?? null,
  estDistanceAfter: raw.est_distance_after ?? null,
});

// POST /staff/runs/{runId}/waypoints (§5.15, A-15) — apply=false 는 미리보기(확정 노선 불변), apply=true 는 그 미리보기의 계산을 배포한다.
// 배포는 preview_token 이 필수이고, 없거나 낡았으면 서버가 409 PREVIEW_STALE 이다. 경로 계산(네이버 Directions)을 부르는 요청은 미리보기뿐이다.
export const postWaypoint = async (runId: string, payload: WaypointRequestTypes): Promise<WaypointResponseTypes> => {
  const body: Record<string, unknown> = { label: payload.label, apply: payload.apply };
  if (payload.address !== undefined) body.address = payload.address;
  if (payload.lat !== undefined) body.lat = payload.lat;
  if (payload.lng !== undefined) body.lng = payload.lng;
  if (payload.seq !== undefined) body.seq = payload.seq;
  if (payload.previewToken !== undefined) body.preview_token = payload.previewToken;
  const raw = await apiFetch<RawWaypointResponse>(`/staff/runs/${runId}/waypoints`, { method: "POST", body });
  return toWaypointResponse(raw);
};

// DELETE /staff/runs/{runId}/waypoints/{waypointId} (§5.15) — 같은 미리보기 → 배포. apply 와 preview_token 은 쿼리다.
export const deleteWaypoint = async (
  runId: string,
  waypointId: string,
  payload: WaypointDeleteRequestTypes,
): Promise<WaypointResponseTypes> => {
  const raw = await apiFetch<RawWaypointResponse>(`/staff/runs/${runId}/waypoints/${waypointId}`, {
    method: "DELETE",
    query: { apply: payload.apply, preview_token: payload.previewToken },
  });
  return toWaypointResponse(raw);
};
