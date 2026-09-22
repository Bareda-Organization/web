import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MapSurfaceProps } from "@/features/map";
import { RouteStopsPanel } from "./RouteStopsPanel";
import { getRouteDetail, getRoutePath, updateRoute } from "../api";
import type { RouteDetailResponseTypes, RoutePathResponseTypes } from "../types";

// §5.9 정차지 관리 + R27-B 지도 — jsdom 한계로 MapSurface 를 목으로 바꾼다
// (RouteMapPanel.test.tsx·ChangeApprovalDetail.test.tsx 와 같은 이유).
vi.mock("../api", () => ({
  getRouteDetail: vi.fn(),
  updateRoute: vi.fn(),
  optimizeRoute: vi.fn(),
  getRoutePath: vi.fn(),
}));

vi.mock("@/features/map", () => ({
  MapSurface: (props: MapSurfaceProps) => {
    void props;
    return null;
  },
}));

const mockGetDetail = vi.mocked(getRouteDetail);
const mockUpdateRoute = vi.mocked(updateRoute);
const mockGetRoutePath = vi.mocked(getRoutePath);

const detail: RouteDetailResponseTypes = {
  id: 1,
  busId: 3,
  busNo: "1호차",
  weekday: "mon",
  direction: "to_academy",
  name: "본선",
  active: true,
  stops: [
    { stopId: 1, seq: 1, name: "정문", lat: 37.1, lng: 127.1 },
    { stopId: 2, seq: 2, name: "후문", lat: 37.2, lng: 127.2 },
  ],
};

const emptyPath: RoutePathResponseTypes = { roadPath: [], fallbackUsed: false, stops: [] };

describe("RouteStopsPanel — 정차지 저장 뒤 지도 경로 재조회", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 완료 근거(호출 계수) — 정차지를 지운 뒤 "정차 순서 저장" 을 누르면 {@code RouteMapPanel}
   * 이 {@code getRoutePath} 를 <b>다시</b> 부른다. 삭제·순서 이동 자체는 로컬 상태만 바꿀 뿐
   * API 를 부르지 않아(코드 확인), 저장 클릭이 실제 관측 지점이다.
   */
  it("정차지를_삭제하고_저장하면_경로를_다시_불러온다", async () => {
    mockGetDetail.mockResolvedValue(detail);
    mockGetRoutePath.mockResolvedValue(emptyPath);
    mockUpdateRoute.mockResolvedValue({ ...detail, stops: [detail.stops[0]] });

    render(<RouteStopsPanel routeId={1} />);

    await screen.findByText("정문");
    await waitFor(() => expect(mockGetRoutePath).toHaveBeenCalledTimes(1));

    const stopRow = screen.getByText("정문").closest("div");
    expect(stopRow).not.toBeNull();
    const removeButton = within(stopRow as HTMLElement).getAllByRole("button").at(-1);
    expect(removeButton).toBeDefined();
    fireEvent.click(removeButton as HTMLElement);

    expect(screen.queryByText("정문")).toBeNull();

    fireEvent.click(screen.getByText("정차 순서 저장"));

    await waitFor(() => expect(mockUpdateRoute).toHaveBeenCalledWith(1, { stopIds: [2] }));
    await waitFor(() => expect(mockGetRoutePath).toHaveBeenCalledTimes(2));
  });
});
