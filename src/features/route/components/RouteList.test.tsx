import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStableRouter } from "@/shared/testing/stableRouter";
import { getBuses } from "@/features/bus";
import { getRoutes } from "../api";
import type { RouteListItemResponseTypes } from "../types";
import { RouteList } from "./RouteList";

const mockRouter = createStableRouter();
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
vi.mock("../api", () => ({ getRoutes: vi.fn() }));
vi.mock("@/features/bus", () => ({ getBuses: vi.fn() }));
// 등록 창은 시작 값만 보인다 — 요일표의 빈 칸이 그 칸의 차량·요일·방향을 넘기는지만 본다.
vi.mock("./RouteForm", () => ({
  RouteForm: ({ initial }: { initial?: { busId?: string; weekday?: string; direction?: string } }) => (
    <div role="dialog" aria-label="편성 등록 창">
      {JSON.stringify(initial)}
    </div>
  ),
}));

const mockGetRoutes = vi.mocked(getRoutes);
const mockGetBuses = vi.mocked(getBuses);

const route = (id: string, stopCount: number, over: Partial<RouteListItemResponseTypes> = {}): RouteListItemResponseTypes => ({
  id,
  busId: "3",
  busNo: "1호차",
  weekday: "mon",
  direction: "to_academy",
  name: `편성 ${id}`,
  active: true,
  stopCount,
  ...over,
});
const bus = (id: string, busNo: string, over: Record<string, unknown> = {}) => ({ id, busNo, plateNo: `99가${id}`, capacity: 25, studentCapacity: 23, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [], ...over });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBuses.mockResolvedValue({ items: [bus("3", "1호차"), bus("4", "4호차", { operable: false })], page: 0, size: 100, totalCount: 2, hasNext: false });
  mockGetRoutes.mockResolvedValue({
    items: [route("1", 3), route("2", 0, { weekday: "tue" }), route("3", 5, { weekday: "wed", active: false })],
    page: 0,
    size: 500,
    totalCount: 3,
    hasNext: false,
  });
});

// R48 요일표 — 서버 목록 전량(size=500)에서 (차량 × 방향 × 요일) 칸을 만든다.
describe("RouteList — 요일표", () => {
  it("전량(size=500)을 읽어 칸에 정차지 수를 보이고, 비활성 · 0곳은 칸에서 따로 말한다", async () => {
    render(<RouteList />);

    const filled = await screen.findByRole("button", { name: "1호차 월요일 등원 편성 — 정차지 3곳" });
    expect(filled).toHaveTextContent("3곳");
    expect(screen.getByRole("button", { name: "1호차 화요일 등원 편성 — 정차지 0곳" })).toHaveTextContent("정차지 없음");
    expect(screen.getByRole("button", { name: "1호차 수요일 등원 편성 — 정차지 5곳 · 비활성" })).toHaveTextContent("비활성");
    expect(mockGetRoutes).toHaveBeenCalledWith(0, 500);
  });

  it("칸을 누르면 그 편성 상세로 가고, 빈 칸을 누르면 그 칸의 차량 · 요일 · 방향으로 등록 창을 연다", async () => {
    render(<RouteList />);

    fireEvent.click(await screen.findByRole("button", { name: "1호차 월요일 등원 편성 — 정차지 3곳" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/route/1");

    fireEvent.click(screen.getByRole("button", { name: "1호차 목요일 하원 편성 만들기" }));
    expect(screen.getByRole("dialog", { name: "편성 등록 창" })).toHaveTextContent('"busId":"3","weekday":"thu","direction":"from_academy"');
  });

  it("편성이 없는 차량은 머리 줄과 편성 만들기를 보인다", async () => {
    render(<RouteList />);

    expect(await screen.findByText("이 차량에는 편성이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("운행 불가")).toBeInTheDocument();
  });

  it("지표에 활성 · 비활성 · 정차지 0곳이 센 값으로 나온다", async () => {
    render(<RouteList />);
    await screen.findByRole("button", { name: "1호차 월요일 등원 편성 — 정차지 3곳" });

    expect(screen.getByText("정차지 0곳", { selector: "div" }).parentElement).toHaveTextContent("1건");
    expect(screen.getByText("비활성", { selector: "div" }).parentElement).toHaveTextContent("1건");
  });
});

// B1 #10 — 목록에 정차지 수 열이 없어 정차지를 아직 안 넣은 빈 편성을 구분할 수 없었다. 목록 보기는 기존 표 그대로 남는다.
describe("RouteList — 목록 보기 · 정차지 수 열", () => {
  it("편성마다 정차지 수를 보이고 빈 편성은 0곳으로 보인다", async () => {
    render(<RouteList />);
    await screen.findByRole("button", { name: "1호차 월요일 등원 편성 — 정차지 3곳" });
    fireEvent.click(screen.getByRole("tab", { name: "목록" }));

    const filled = (await screen.findByText("편성 1")).closest("tr") as HTMLElement;
    const empty = screen.getByText("편성 2").closest("tr") as HTMLElement;

    expect(screen.getByRole("columnheader", { name: "정차지 수" })).toBeInTheDocument();
    expect(within(filled).getByText("3곳")).toBeInTheDocument();
    expect(within(empty).getByText("0곳")).toBeInTheDocument();
  });
});
