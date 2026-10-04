import type { RouteListItemResponseTypes, RunDirection, Weekday } from "../types";

// 고정 노선 편성 요일표의 계산 — 서버 목록 전량에서 (차량 × 방향 × 요일) 칸을 만드는 순수 함수 모음.
export const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DIRECTIONS: RunDirection[] = ["to_academy", "from_academy"];

export type GridBus = { id: string; busNo: string; plateNo?: string; operable?: boolean };

export type GridRow = {
  bus: GridBus;
  directions: RunDirection[];
  /** 방향 → 요일 → 편성. 편성이 없는 칸은 비어 있다 */
  cells: Record<RunDirection, Partial<Record<Weekday, RouteListItemResponseTypes>>>;
  hasRoutes: boolean;
};

export const buildRouteGrid = (routes: RouteListItemResponseTypes[], buses: GridBus[], filter: { busId?: string; direction?: RunDirection } = {}): GridRow[] =>
  buses
    .filter((bus) => !filter.busId || bus.id === filter.busId)
    .map((bus) => {
      const cells: GridRow["cells"] = { to_academy: {}, from_academy: {} };
      const mine = routes.filter((route) => route.busId === bus.id);
      mine.forEach((route) => {
        cells[route.direction][route.weekday] = route;
      });
      return { bus, directions: filter.direction ? [filter.direction] : DIRECTIONS, cells, hasRoutes: mine.length > 0 };
    });

export type RouteSummary = {
  total: number;
  active: number;
  inactive: number;
  busCount: number;
  /** 정차지가 0곳인 활성 편성 — 출발 30분 전 확정 노선이 비어 도는 길이 없다 */
  empty: RouteListItemResponseTypes[];
  inactiveRoutes: RouteListItemResponseTypes[];
};

export const summarizeRoutes = (routes: RouteListItemResponseTypes[]): RouteSummary => ({
  total: routes.length,
  active: routes.filter((route) => route.active).length,
  inactive: routes.filter((route) => !route.active).length,
  busCount: new Set(routes.map((route) => route.busId)).size,
  empty: routes.filter((route) => route.active && route.stopCount === 0),
  inactiveRoutes: routes.filter((route) => !route.active),
});

const EN_WEEKDAY_TO_CODE: Record<string, Weekday> = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };
const SEOUL_WEEKDAY = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short" });

/** 오늘(한국 시간)의 요일 — 요일표의 오늘 열을 가른다 */
export const todayWeekday = (now: Date = new Date()): Weekday => EN_WEEKDAY_TO_CODE[SEOUL_WEEKDAY.format(now)] ?? "mon";
