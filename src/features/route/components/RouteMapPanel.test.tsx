import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MapSurfaceProps } from "@/features/map";
import { RouteMapPanel } from "./RouteMapPanel";
import { getRoutePath } from "../api";
import type { RoutePathResponseTypes } from "../types";

// §5.9 GET /staff/routes/{id}/path(R27-B 신설) — jsdom 은 실제 네이버 지도 SDK 를 못 그리므로
// (ChangeApprovalDetail.test.tsx 와 같은 한계) MapSurface 를 목으로 바꿔 이 패널이 계산한
// markers·polylines·camera 만 검증한다.
vi.mock("../api", () => ({
  getRoutePath: vi.fn(),
}));

const mockMapSurface = vi.fn((_props: MapSurfaceProps) => null);
vi.mock("@/features/map", () => ({
  MapSurface: (props: MapSurfaceProps) => mockMapSurface(props),
}));

const mockGetRoutePath = vi.mocked(getRoutePath);

const path: RoutePathResponseTypes = {
  roadPath: [
    { lat: 37.1, lng: 127.1 },
    { lat: 37.15, lng: 127.15 },
    { lat: 37.2, lng: 127.2 },
  ],
  fallbackUsed: false,
  stops: [
    { stopId: 1, seq: 1, name: "정문", lat: 37.1, lng: 127.1 },
    { stopId: 2, seq: 2, name: "후문", lat: 37.2, lng: 127.2 },
  ],
};

describe("RouteMapPanel — 편성 정차지·도로 경로 지도", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("마커 수는 정차지 수와 같고, 도로 경로는 MapSurface 의 polylines 로 전달된다", async () => {
    mockGetRoutePath.mockResolvedValue(path);

    render(<RouteMapPanel routeId={1} refreshKey={0} />);

    await waitFor(() => expect(mockMapSurface).toHaveBeenCalled());

    const props = mockMapSurface.mock.calls.at(-1)?.[0];
    expect(props?.markers).toHaveLength(path.stops.length);
    expect(props?.markers.map((marker) => marker.id)).toEqual(["stop-1", "stop-2"]);
    expect(props?.polylines).toEqual([
      { id: "route-1", points: path.roadPath, kind: "route", approximate: false },
    ]);
  });

  it("정차지가 없으면 아무것도 그리지 않는다", async () => {
    mockGetRoutePath.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [] });

    const { container } = render(<RouteMapPanel routeId={1} refreshKey={0} />);

    await waitFor(() => expect(mockGetRoutePath).toHaveBeenCalled());
    expect(mockMapSurface).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  // 정차지 추가·삭제·순서 저장 뒤 부모(RouteStopsPanel)가 refreshKey 를 올리면 이 패널이
  // 경로를 다시 불러야 한다 — "완료 근거" 의 호출 계수 단언.
  it("refreshKey 가 바뀌면 경로를 다시 불러온다", async () => {
    mockGetRoutePath.mockResolvedValue(path);

    const { rerender } = render(<RouteMapPanel routeId={1} refreshKey={0} />);
    await waitFor(() => expect(mockGetRoutePath).toHaveBeenCalledTimes(1));

    rerender(<RouteMapPanel routeId={1} refreshKey={1} />);
    await waitFor(() => expect(mockGetRoutePath).toHaveBeenCalledTimes(2));
  });
});
