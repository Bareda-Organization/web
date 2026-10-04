import type { RoutePathResponseTypes, RouteStop } from "../types";

// 노선 편성 상세의 지표 계산 — 서버가 준 정차지 `rider_count` · 경로 `distance_m`·`duration_s` 를 화면 값으로.
export const riderFigures = (stops: Pick<RouteStop, "riderCount">[]): { total: number; min: number; max: number } | null => {
  const counts = stops.map((stop) => stop.riderCount).filter((count): count is number => typeof count === "number");
  if (counts.length === 0) return null;
  return { total: counts.reduce((sum, count) => sum + count, 0), min: Math.min(...counts), max: Math.max(...counts) };
};

// 직선 근사(`fallback_used`)이거나 경로가 비면 서버가 거리·소요를 null 로 준다 — 그때는 숨긴다.
export const pathFigures = (path: Pick<RoutePathResponseTypes, "distanceM" | "durationS" | "computedAt"> | undefined): { minutes: number; km: string; computedAt: string | null } | null => {
  if (!path || path.durationS == null || path.distanceM == null) return null;
  return { minutes: Math.round(path.durationS / 60), km: (path.distanceM / 1000).toFixed(1), computedAt: path.computedAt ?? null };
};
