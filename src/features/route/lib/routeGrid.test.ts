import { describe, expect, it } from "vitest";
import type { RouteListItemResponseTypes } from "../types";
import { buildRouteGrid, summarizeRoutes } from "./routeGrid";

const r = (id: string, busId: string, weekday: RouteListItemResponseTypes["weekday"], direction: RouteListItemResponseTypes["direction"], over: Partial<RouteListItemResponseTypes> = {}): RouteListItemResponseTypes => ({
  id,
  busId,
  busNo: `${busId}호차`,
  weekday,
  direction,
  name: null,
  active: true,
  stopCount: 10,
  ...over,
});
const bus = (id: string, over: Record<string, unknown> = {}) => ({ id, busNo: `${id}호차`, plateNo: `99가${id}`, operable: true, ...over });

// R48-WEB-STAFF 고정 노선 편성 — 요일표(차량 × 방향 × 요일)는 서버 목록 전량에서 만든다. 칸 하나 = (bus_id, weekday, direction) 한 편성(uk_route_bus_weekday_direction).
describe("buildRouteGrid — 요일표", () => {
  const routes = [r("1", "1", "mon", "to_academy"), r("2", "1", "mon", "from_academy", { stopCount: 0 }), r("3", "2", "wed", "to_academy", { active: false })];

  it("편성을 (차량, 방향, 요일) 칸에 놓고, 편성이 없는 차량도 머리 줄을 남긴다", () => {
    const rows = buildRouteGrid(routes, [bus("1"), bus("2"), bus("4", { operable: false })]);
    expect(rows.map((row) => row.bus.busNo)).toEqual(["1호차", "2호차", "4호차"]);
    expect(rows[0].cells.to_academy.mon?.id).toBe("1");
    expect(rows[0].cells.from_academy.mon?.id).toBe("2");
    expect(rows[0].cells.to_academy.tue).toBeUndefined();
    expect(rows[1].cells.to_academy.wed?.active).toBe(false);
    expect(rows[2].hasRoutes).toBe(false);
  });

  it("차량 · 방향 필터는 행을 거른다", () => {
    expect(buildRouteGrid(routes, [bus("1"), bus("2")], { busId: "2" }).map((row) => row.bus.busNo)).toEqual(["2호차"]);
    expect(buildRouteGrid(routes, [bus("1")], { direction: "from_academy" })[0].directions).toEqual(["from_academy"]);
  });
});

describe("summarizeRoutes — 지표", () => {
  it("활성 · 비활성 · 정차지 0곳(활성인데 비어 있는 편성) 이름을 센다", () => {
    const summary = summarizeRoutes([r("1", "1", "mon", "to_academy"), r("2", "1", "sun", "from_academy", { stopCount: 0 }), r("3", "2", "wed", "to_academy", { active: false, stopCount: 0 })]);
    expect(summary).toMatchObject({ total: 3, active: 2, inactive: 1, busCount: 2 });
    expect(summary.empty.map((route) => route.id)).toEqual(["2"]);
    expect(summary.inactiveRoutes.map((route) => route.id)).toEqual(["3"]);
  });
});
