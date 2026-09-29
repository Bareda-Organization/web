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

const mockMapSurface = vi.fn<(props: MapSurfaceProps) => null>(() => null);
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
    { stopId: "1", seq: 1, name: "정문", lat: 37.1, lng: 127.1 },
    { stopId: "2", seq: 2, name: "후문", lat: 37.2, lng: 127.2 },
  ],
};

type PanelProps = Parameters<typeof RouteMapPanel>[0];

const 기본: PanelProps = {
  routeId: "1",
  direction: "to_academy",
  refreshKey: 0,
  stops: [
    { key: "a", lat: 37.1, lng: 127.1 },
    { key: "b", lat: 37.2, lng: 127.2 },
  ],
  editingKey: null,
  pin: null,
  focus: null,
  dirty: false,
  onPinMove: () => {},
};

const 마지막_props = () => mockMapSurface.mock.calls.at(-1)?.[0] as MapSurfaceProps;

describe("RouteMapPanel — 편성 정차지·도로 경로 지도", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("정차지는 목록 순서대로 번호 핀, 도로 경로는 polylines, 양 끝은 시점·종점으로 넘긴다", async () => {
    mockGetRoutePath.mockResolvedValue(path);

    render(<RouteMapPanel {...기본} />);

    await waitFor(() => expect(마지막_props()?.polylines).toHaveLength(1));
    const props = 마지막_props();
    expect(props.markers.filter((marker) => marker.kind === "stop").map((marker) => [marker.id, marker.seq]))
      .toEqual([["stop-a", 1], ["stop-b", 2]]);
    expect(props.polylines).toEqual([{ id: "route-1", points: path.roadPath, kind: "route", approximate: false }]);
    // 등원 — 시점은 첫 승차지, 종점은 도로 경로의 끝(학원).
    expect(props.markers.find((marker) => marker.kind === "origin")).toMatchObject({ lat: 37.1, lng: 127.1 });
    expect(props.markers.find((marker) => marker.kind === "destination")).toMatchObject({ lat: 37.2, lng: 127.2 });
  });

  it("하원은 학원이 시점, 마지막 하차지가 종점이다", async () => {
    mockGetRoutePath.mockResolvedValue(path);

    render(<RouteMapPanel {...기본} direction="from_academy" />);

    await waitFor(() => expect(마지막_props()?.polylines).toHaveLength(1));
    expect(마지막_props().markers.find((marker) => marker.kind === "origin")).toMatchObject({ lat: 37.1, lng: 127.1 });
    expect(마지막_props().markers.find((marker) => marker.kind === "destination"))
      .toMatchObject({ lat: 37.2, lng: 127.2 });
  });

  it("정차지가 없어도 지도는 그린다(첫 승하차지를 넣을 자리) — 시점·종점은 없다", async () => {
    mockGetRoutePath.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [] });

    render(<RouteMapPanel {...기본} stops={[]} />);

    await waitFor(() => expect(mockGetRoutePath).toHaveBeenCalled());
    expect(마지막_props().markers).toEqual([]);
  });

  it("수정 중인 핀만 끌 수 있고, 그 핀을 놓으면 새 자리를 알린다", async () => {
    mockGetRoutePath.mockResolvedValue(path);
    const onPinMove = vi.fn();

    render(<RouteMapPanel {...기본} editingKey="b" pin={{ lat: 37.2, lng: 127.2 }} onPinMove={onPinMove} />);

    await waitFor(() => expect(마지막_props()).toBeDefined());
    expect(마지막_props().markers.filter((marker) => marker.draggable).map((marker) => marker.id)).toEqual(["stop-b"]);
    마지막_props().onMarkerDragEnd?.("stop-a", { lat: 1, lng: 1 });
    마지막_props().onMarkerDragEnd?.("stop-b", { lat: 37.25, lng: 127.25 });
    expect(onPinMove).toHaveBeenCalledTimes(1);
    expect(onPinMove).toHaveBeenCalledWith({ lat: 37.25, lng: 127.25 });
  });

  // 저장·최적화 뒤 부모(RouteStopsPanel)가 refreshKey 를 올리면 이 패널이 경로를 다시 불러야 한다.
  it("refreshKey 가 바뀌면 경로를 다시 불러온다", async () => {
    mockGetRoutePath.mockResolvedValue(path);

    const { rerender } = render(<RouteMapPanel {...기본} />);
    await waitFor(() => expect(mockGetRoutePath).toHaveBeenCalledTimes(1));

    rerender(<RouteMapPanel {...기본} refreshKey={1} />);
    await waitFor(() => expect(mockGetRoutePath).toHaveBeenCalledTimes(2));
  });
});
