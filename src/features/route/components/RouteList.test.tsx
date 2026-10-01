import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStableRouter } from "@/shared/testing/stableRouter";
import { getRoutes } from "../api";
import type { RouteListItemResponseTypes } from "../types";
import { RouteList } from "./RouteList";

const mockRouter = createStableRouter();
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
vi.mock("../api", () => ({ getRoutes: vi.fn() }));
vi.mock("./RouteForm", () => ({ RouteForm: () => null }));

const mockGetRoutes = vi.mocked(getRoutes);

const route = (id: string, stopCount: number): RouteListItemResponseTypes => ({
  id,
  busId: "3",
  busNo: "1호차",
  weekday: "mon",
  direction: "to_academy",
  name: `편성 ${id}`,
  active: true,
  stopCount,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRoutes.mockResolvedValue({ items: [route("1", 3), route("2", 0)], page: 0, size: 20, totalCount: 2, hasNext: false });
});

// B1 #10 — 목록에 정차지 수 열이 없어 정차지를 아직 안 넣은 빈 편성을 구분할 수 없었다.
describe("RouteList — 정차지 수 열", () => {
  it("편성마다 정차지 수를 보이고 빈 편성은 0곳으로 보인다", async () => {
    render(<RouteList />);

    const filled = (await screen.findByText("편성 1")).closest("tr") as HTMLElement;
    const empty = screen.getByText("편성 2").closest("tr") as HTMLElement;

    expect(screen.getByRole("columnheader", { name: "정차지 수" })).toBeInTheDocument();
    expect(within(filled).getByText("3곳")).toBeInTheDocument();
    expect(within(empty).getByText("0곳")).toBeInTheDocument();
  });
});
