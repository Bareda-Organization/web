import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  WaypointDeleteRequestTypes,
  WaypointPreviewStopTypes,
  WaypointRequestTypes,
  WaypointResponseTypes,
  WaypointRoutePreviewTypes,
} from "../types";

type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type WireStopRef = WithId<WaypointRoutePreviewTypes["reordered"][number], "stopId">;

// 서버 id 는 숫자 — 화면 타입은 문자열. 서버가 비워 보낼 수 있는 칸(eta · 좌표 · 추정치 · 경로선)은 null · 빈 배열로 채운다.
type WireWaypoint = OptionalKeys<
  Omit<WaypointResponseTypes, "waypointId" | "routePreview"> & {
    waypointId: string | number | null;
    routePreview: Omit<
      WaypointRoutePreviewTypes,
      "stopsBefore" | "stopsAfter" | "reordered" | "removed" | "roadPathBefore" | "roadPathAfter"
    > & {
      stopsBefore: OptionalKeys<WaypointPreviewStopTypes, "eta" | "lat" | "lng">[];
      stopsAfter: OptionalKeys<WaypointPreviewStopTypes, "eta" | "lat" | "lng">[];
      reordered: WireStopRef[];
      removed: WireStopRef[];
      roadPathBefore?: { lat: number; lng: number }[];
      roadPathAfter?: { lat: number; lng: number }[];
    };
  },
  "previewToken" | "estDurationBefore" | "estDurationAfter" | "estDistanceBefore" | "estDistanceAfter"
>;

const toPreviewStop = (raw: WireWaypoint["routePreview"]["stopsBefore"][number]): WaypointPreviewStopTypes => ({
  ...raw,
  eta: raw.eta ?? null,
  lat: raw.lat ?? null,
  lng: raw.lng ?? null,
});

// 순서가 바뀐 · 빠진 승하차지는 이름만 쓴다 — 서버가 더 얹는 칸(좌표 등)은 화면 타입에 싣지 않는다.
const toStopRef = (raw: WireStopRef) => ({ stopId: asIdString(raw.stopId), stopName: raw.stopName });

const toWaypointResponse = (raw: WireWaypoint): WaypointResponseTypes => ({
  ...raw,
  waypointId: raw.waypointId == null ? null : asIdString(raw.waypointId),
  previewToken: raw.previewToken ?? null,
  routePreview: {
    ...raw.routePreview,
    stopsBefore: raw.routePreview.stopsBefore.map(toPreviewStop),
    stopsAfter: raw.routePreview.stopsAfter.map(toPreviewStop),
    reordered: raw.routePreview.reordered.map(toStopRef),
    removed: raw.routePreview.removed.map(toStopRef),
    roadPathBefore: raw.routePreview.roadPathBefore ?? [],
    roadPathAfter: raw.routePreview.roadPathAfter ?? [],
  },
  estDurationBefore: raw.estDurationBefore ?? null,
  estDurationAfter: raw.estDurationAfter ?? null,
  estDistanceBefore: raw.estDistanceBefore ?? null,
  estDistanceAfter: raw.estDistanceAfter ?? null,
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
  const raw = await apiFetch<WireWaypoint>(`/staff/runs/${runId}/waypoints`, { method: "POST", body });
  return toWaypointResponse(raw);
};

// DELETE /staff/runs/{runId}/waypoints/{waypointId} (§5.15) — 같은 미리보기 → 배포. apply 와 preview_token 은 쿼리다.
export const deleteWaypoint = async (
  runId: string,
  waypointId: string,
  payload: WaypointDeleteRequestTypes,
): Promise<WaypointResponseTypes> => {
  const raw = await apiFetch<WireWaypoint>(`/staff/runs/${runId}/waypoints/${waypointId}`, {
    method: "DELETE",
    query: { apply: payload.apply, preview_token: payload.previewToken },
  });
  return toWaypointResponse(raw);
};
