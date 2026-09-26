import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapMarker, MapSurfaceProps } from "@/features/map";
import { RouteStopsPanel } from "./RouteStopsPanel";
import { getRouteDetail, getRoutePath, optimizeRoute, saveRouteStops, suggestStops } from "../api";
import type { RouteDetailResponseTypes, RoutePathResponseTypes } from "../types";
import { confirmLeave } from "@/shared/lib/navigation/leaveGuard";

// 고정 노선 편성 — 승하차지 목록·추가·수정·삭제·저장(2026-09-23 사용자 지시 11건 중 1·2·3·4·5·7·8·10).
// jsdom 에는 지도가 없어 MapSurface 를 목으로 바꾸고, 넘어간 props 로 "지도에 무엇을 그리라고 했는가" 를 본다.
vi.mock("../api", () => ({
  getRouteDetail: vi.fn(),
  getRoutePath: vi.fn(),
  saveRouteStops: vi.fn(),
  suggestStops: vi.fn(),
  optimizeRoute: vi.fn(),
}));

const mapProps: MapSurfaceProps[] = [];
vi.mock("@/features/map", () => ({
  MapSurface: (props: MapSurfaceProps) => {
    mapProps.push(props);
    return null;
  },
}));

const mockGetDetail = vi.mocked(getRouteDetail);
const mockGetPath = vi.mocked(getRoutePath);
const mockSave = vi.mocked(saveRouteStops);
const mockSuggest = vi.mocked(suggestStops);
const mockOptimize = vi.mocked(optimizeRoute);

const detail: RouteDetailResponseTypes = {
  id: "1",
  busId: "3",
  busNo: "1호차",
  weekday: "mon",
  direction: "to_academy",
  name: "본선",
  active: true,
  stops: [
    { stopId: "1", seq: 1, name: "정문", lat: 37.1, lng: 127.1 },
    { stopId: "2", seq: 2, name: "후문", lat: 37.2, lng: 127.2 },
  ],
};

// 등원 — 도로 경로는 첫 승차지에서 시작해 학원(37.9, 127.9)에서 끝난다(Ruling 190).
const path: RoutePathResponseTypes = {
  roadPath: [
    { lat: 37.1, lng: 127.1 },
    { lat: 37.5, lng: 127.5 },
    { lat: 37.9, lng: 127.9 },
  ],
  fallbackUsed: false,
  stops: detail.stops,
};

const 마지막_지도 = (): MapSurfaceProps => mapProps[mapProps.length - 1];
const 마커 = (kind: MapMarker["kind"]): MapMarker[] => 마지막_지도().markers.filter((marker) => marker.kind === kind);

const 띄운다 = async () => {
  render(<RouteStopsPanel routeId="1" direction="to_academy" />);
  await screen.findByText("정문");
  await waitFor(() => expect(mockGetPath).toHaveBeenCalled());
};

const 행 = (name: string): HTMLElement => screen.getByText(name).closest("[role=listitem]") as HTMLElement;

/** 주소를 쳐서 첫 후보를 고른다 — 자동완성은 입력을 멈춘 뒤에 부른다. */
const 후보를_고른다 = async (query: string) => {
  fireEvent.change(screen.getByLabelText("주소 검색"), { target: { value: query } });
  fireEvent.click(await screen.findByRole("option", { name: "서울시 목동서로 1" }));
};

beforeEach(() => {
  mapProps.length = 0;
  mockGetDetail.mockResolvedValue(detail);
  mockGetPath.mockResolvedValue(path);
  mockSuggest.mockResolvedValue([
    { lat: 37.3, lng: 127.3, displayName: "서울시 목동서로 1", nearby: [] },
    { lat: 37.4, lng: 127.4, displayName: "서울시 목동서로 11", nearby: [] },
  ]);
  mockSave.mockImplementation(async (_routeId, stops) => ({
    ...detail,
    stops: stops.map((stop, index) => ({
      stopId: stop.stopId ?? String(100 + index),
      seq: index + 1,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
    })),
  }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("RouteStopsPanel — 저장 버튼을 눌러야 반영된다(지시 7)", () => {
  it("추가·수정·삭제는 저장 전까지 서버로 가지 않고, 저장하면 한 번에 목록 순서대로 보낸다", async () => {
    await 띄운다();

    fireEvent.click(within(행("후문")).getByRole("button", { name: "후문 삭제" }));

    fireEvent.click(within(행("정문")).getByRole("button", { name: "정문 수정" }));
    fireEvent.change(screen.getByLabelText("표시명"), { target: { value: "정문 앞 모퉁이" } });
    fireEvent.click(screen.getByRole("button", { name: "적용" }));

    fireEvent.click(screen.getByRole("button", { name: "승하차지 추가" }));
    await 후보를_고른다("목동서로");
    fireEvent.click(screen.getByRole("button", { name: "목록에 추가" }));

    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.getByText("정문 앞 모퉁이")).toBeInTheDocument();
    expect(screen.queryByText("후문")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    expect(mockSave).toHaveBeenCalledWith("1", [
      { stopId: "1", name: "정문 앞 모퉁이", address: undefined, lat: 37.1, lng: 127.1 },
      { stopId: undefined, name: "서울시 목동서로 1", address: "서울시 목동서로 1", lat: 37.3, lng: 127.3 },
    ]);
  });

  it("되돌리기를 누르면 마지막으로 저장된 목록으로 돌아가고 저장은 다시 막힌다", async () => {
    await 띄운다();
    const 저장 = screen.getByRole("button", { name: "저장" });
    expect(저장).toBeDisabled();

    fireEvent.click(within(행("후문")).getByRole("button", { name: "후문 삭제" }));
    expect(저장).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));

    expect(screen.getByText("후문")).toBeInTheDocument();
    expect(저장).toBeDisabled();
  });
});

describe("RouteStopsPanel — 저장 안 한 채 앱 안에서 떠날 때(뒤로·사이드바·로그아웃)", () => {
  it("변경이 있는 동안만 떠나기 전에 묻고, 저장하면 풀린다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await 띄운다();
    expect(confirmLeave()).toBe(true);

    fireEvent.click(within(행("후문")).getByRole("button", { name: "후문 삭제" }));
    expect(confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("저장하지 않은 변경 1건"));

    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("저장된 상태입니다");
    expect(confirmLeave()).toBe(true);
    confirm.mockRestore();
  });
});

describe("RouteStopsPanel — 주소 자동완성과 핀 끌기(지시 2·3·10)", () => {
  it("주소를 치다 멈추면 후보를 부르고, 고른 후보 자리에 끌 수 있는 핀을 찍는다", async () => {
    await 띄운다();
    fireEvent.click(screen.getByRole("button", { name: "승하차지 추가" }));

    await 후보를_고른다("목동서로");

    expect(mockSuggest).toHaveBeenCalledWith("목동서로");
    const draft = 마지막_지도().markers.find((marker) => marker.draggable);
    expect(draft).toMatchObject({ lat: 37.3, lng: 127.3, draggable: true });
  });

  it("핀을 끌어 놓은 자리가 추가할 자리가 된다(지도 클릭으로는 옮기지 않는다)", async () => {
    await 띄운다();
    fireEvent.click(screen.getByRole("button", { name: "승하차지 추가" }));
    await 후보를_고른다("목동서로");
    const draftId = 마지막_지도().markers.find((marker) => marker.draggable)?.id as string;

    act(() => 마지막_지도().onMarkerDragEnd?.(draftId, { lat: 37.31, lng: 127.29 }));
    fireEvent.click(screen.getByRole("button", { name: "목록에 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSave.mock.calls[0][1][2]).toMatchObject({ lat: 37.31, lng: 127.29 });
    expect(마지막_지도().onMapClick).toBeUndefined();
  });

  // 2026-09-23 — 장소 검색 후보는 장소 이름을 표시명 기본값으로, 주소는 도로명으로 보낸다.
  it("장소 후보를 고르면 장소 이름이 표시명, 도로명이 주소가 된다", async () => {
    mockSuggest.mockResolvedValue([
      { placeName: "신정역 5호선", lat: 37.52, lng: 126.85, displayName: "서울특별시 양천구 오목로 179", nearby: [] },
    ]);
    await 띄운다();
    fireEvent.click(screen.getByRole("button", { name: "승하차지 추가" }));
    fireEvent.change(screen.getByLabelText("주소 검색"), { target: { value: "신정역" } });
    fireEvent.click(await screen.findByRole("option", { name: /신정역 5호선/ }));

    expect(screen.getByLabelText("표시명")).toHaveValue("신정역 5호선");
    fireEvent.click(screen.getByRole("button", { name: "목록에 추가" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSave.mock.calls[0][1][2]).toMatchObject({ name: "신정역 5호선", address: "서울특별시 양천구 오목로 179" });
  });

  it("후보 목록은 키보드로 고를 수 있다(↓ 다음 Enter)", async () => {
    await 띄운다();
    fireEvent.click(screen.getByRole("button", { name: "승하차지 추가" }));
    const 입력칸 = screen.getByLabelText("주소 검색");
    fireEvent.change(입력칸, { target: { value: "목동서로" } });
    await screen.findByRole("option", { name: /목동서로 11/ });

    fireEvent.keyDown(입력칸, { key: "ArrowDown" });
    fireEvent.keyDown(입력칸, { key: "ArrowDown" });
    fireEvent.keyDown(입력칸, { key: "Enter" });

    expect(마지막_지도().markers.find((marker) => marker.draggable)).toMatchObject({ lat: 37.4, lng: 127.4 });
  });

  it("주소 검색칸은 추가·수정 양식 안에만 있다", async () => {
    await 띄운다();
    expect(screen.queryByLabelText("주소 검색")).not.toBeInTheDocument();

    fireEvent.click(within(행("정문")).getByRole("button", { name: "정문 수정" }));

    expect(screen.getByLabelText("주소 검색")).toBeInTheDocument();
  });
});

describe("RouteStopsPanel — 최적화·지도 표기(지시 4·8)", () => {
  it("위경도 입력칸이 없고, 최적화는 기준점 없이 부르며, 저장 안 한 변경이 있으면 막는다", async () => {
    mockOptimize.mockResolvedValue({ ...detail, stops: [...detail.stops].reverse() });
    await 띄운다();
    expect(screen.queryByLabelText(/위도|경도/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "순서 최적화" }));
    fireEvent.click(screen.getByRole("button", { name: "확정하고 최적화" }));

    await waitFor(() => expect(mockOptimize).toHaveBeenCalledWith("1", []));

    // 정차지 수는 그대로(2곳) 두고 순서만 바꾼다 — 지우면 "2곳 미만" 규칙이 먼저 막아 이 조건이 가려진다.
    // 최적화 응답이 [후문, 정문] 이라 정문은 둘째 줄이다.
    await screen.findByText("저장된 상태입니다");
    fireEvent.click(within(행("정문")).getByRole("button", { name: "정문 위로" }));
    expect(screen.getByText("저장하지 않은 변경 1건")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "순서 최적화" })).toBeDisabled();
  });

  // 2026-09-23 사용자 지시 — "특정 순서나 시점, 종점을 고정". 고정은 저장 대상이 아니라 최적화에 넘기는 조건이다.
  it("자물쇠를 채운 승하차지를 실어 최적화하고, 고정은 저장할 변경으로 세지 않는다", async () => {
    mockOptimize.mockResolvedValue(detail);
    await 띄운다();

    fireEvent.click(within(행("후문")).getByRole("button", { name: "후문 자리 고정" }));

    expect(within(행("후문")).getByRole("button", { name: "후문 자리 고정" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("저장된 상태입니다")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "순서 최적화" }));
    expect(screen.getByText(/고정한 1곳은 자리를 지키고/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "확정하고 최적화" }));

    await waitFor(() => expect(mockOptimize).toHaveBeenCalledWith("1", ["2"]));
  });

  it("한 번에 여러 줄을 고정해도 하나도 빠지지 않는다", async () => {
    mockOptimize.mockResolvedValue(detail);
    await 띄운다();

    act(() => {
      within(행("정문")).getByRole("button", { name: "정문 자리 고정" }).click();
      within(행("후문")).getByRole("button", { name: "후문 자리 고정" }).click();
    });
    fireEvent.click(screen.getByRole("button", { name: "순서 최적화" }));
    fireEvent.click(screen.getByRole("button", { name: "확정하고 최적화" }));

    await waitFor(() => expect(mockOptimize).toHaveBeenCalledWith("1", ["1", "2"]));
  });

  it("등원은 첫 줄이 시점, 하원은 마지막 줄이 종점이라고 표시한다(학원 쪽 끝은 늘 고정)", async () => {
    const { unmount } = render(<RouteStopsPanel routeId="1" direction="to_academy" />);
    await screen.findByText("정문");
    expect(within(행("정문")).getByText("시점")).toBeInTheDocument();
    expect(within(행("후문")).queryByText("종점")).not.toBeInTheDocument();
    unmount();

    render(<RouteStopsPanel routeId="1" direction="from_academy" />);
    await screen.findByText("정문");
    expect(within(행("후문")).getByText("종점")).toBeInTheDocument();
    expect(within(행("정문")).queryByText("시점")).not.toBeInTheDocument();
  });

  it("등원은 첫 승차지를 시점, 학원을 종점으로 찍고 순서를 바꾸면 핀 번호와 시점이 바로 따라온다", async () => {
    await 띄운다();
    expect(마커("origin")).toEqual([expect.objectContaining({ lat: 37.1, lng: 127.1 })]);
    expect(마커("destination")).toEqual([expect.objectContaining({ lat: 37.9, lng: 127.9 })]);

    fireEvent.click(within(행("후문")).getByRole("button", { name: "후문 위로" }));

    expect(마커("stop").map((marker) => [marker.seq, marker.lat])).toEqual([[1, 37.2], [2, 37.1]]);
    expect(마커("origin")).toEqual([expect.objectContaining({ lat: 37.2, lng: 127.2 })]);
  });
});
