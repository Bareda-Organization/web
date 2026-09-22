import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MapSurfaceProps } from "@/features/map";
import { RouteStopsPanel } from "./RouteStopsPanel";
import { addRouteStop, getRouteDetail, getRoutePath, searchStopAddress, updateRoute } from "../api";
import type { RouteDetailResponseTypes, RoutePathResponseTypes } from "../types";

// §5.9 정차지 관리 + R27-B 지도 — jsdom 한계로 MapSurface 를 목으로 바꾼다
// (RouteMapPanel.test.tsx·ChangeApprovalDetail.test.tsx 와 같은 이유).
vi.mock("../api", () => ({
  getRouteDetail: vi.fn(),
  updateRoute: vi.fn(),
  optimizeRoute: vi.fn(),
  getRoutePath: vi.fn(),
  searchStopAddress: vi.fn(),
  addRouteStop: vi.fn(),
}));

const mapProps: MapSurfaceProps[] = [];
vi.mock("@/features/map", () => ({
  MapSurface: (props: MapSurfaceProps) => {
    mapProps.push(props);
    return null;
  },
}));

const mockGetDetail = vi.mocked(getRouteDetail);
const mockUpdateRoute = vi.mocked(updateRoute);
const mockGetRoutePath = vi.mocked(getRoutePath);
const mockSearch = vi.mocked(searchStopAddress);
const mockAddStop = vi.mocked(addRouteStop);

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

// 사용자 지시(2026-09-22) — 정차지를 **도로명 주소로 검색**하고, 지도에서 정확한 지점을 확인·수정한
// 뒤에 반영한다. 지오코딩이 돌려주는 점(대개 건물 중심)과 버스가 실제로 서는 자리(블록 모퉁이·도로가)가
// 다르기 때문이다.
describe("RouteStopsPanel — 주소 검색 → 확인 → 수정 → 반영", () => {
  afterEach(() => {
    mapProps.length = 0;
    vi.clearAllMocks();
  });

  const 검색결과 = {
    lat: 37.5,
    lng: 127.0,
    displayName: "서울시 테스트로 12",
    nearby: [],
  };

  const 검색한다 = async (address = "테스트로 12") => {
    mockGetDetail.mockResolvedValue(detail);
    mockGetRoutePath.mockResolvedValue(emptyPath);
    mockSearch.mockResolvedValue(검색결과);
    render(<RouteStopsPanel routeId={1} />);
    await screen.findByText("정문");

    fireEvent.change(screen.getByLabelText("도로명 주소로 검색"), { target: { value: address } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByText(/서울시 테스트로 12/);
  };

  it("검색하면 정규화된 주소가 뜨고 지도에 임시 핀이 전달된다", async () => {
    await 검색한다();

    const last = mapProps[mapProps.length - 1];
    expect(last.markers.some((marker) => marker.lat === 37.5 && marker.lng === 127.0)).toBe(true);
  });

  // 3km 축척으로 노선 전체를 담으면 "블록 왼쪽 모퉁이" 를 찍을 수 없다 — 검색 중에는 그 지점을
  // 확대해 보여줘야 이 기능이 성립한다.
  it("검색 중에는 내용 맞춤을 끄고 그 지점을 확대한다", async () => {
    await 검색한다();

    const last = mapProps[mapProps.length - 1];
    expect(last.fitToContent).toBe(false);
    expect(last.camera.lat).toBe(37.5);
    expect(last.camera.zoom).toBeGreaterThanOrEqual(17);
  });

  it("검색만으로는 노선이 바뀌지 않는다 — 반영은 버튼을 눌러야 일어난다", async () => {
    await 검색한다();

    expect(mockAddStop).not.toHaveBeenCalled();
  });

  it("지도를 누르면 그 좌표로 지점을 옮기고 옮긴 거리를 알려준다", async () => {
    await 검색한다();

    const last = mapProps[mapProps.length - 1];
    last.onMapClick?.({ lat: 37.5009, lng: 127.0 });

    // 약 100m 북쪽 — 검색 결과에서 옮겼다는 사실이 화면에 남아야 관계자가 되돌릴 수 있다.
    expect(await screen.findByText(/검색 위치에서 약 \d+m 옮김/)).toBeInTheDocument();
    const moved = mapProps[mapProps.length - 1];
    expect(moved.markers.some((marker) => marker.lat === 37.5009)).toBe(true);
  });

  it("반영을 누르면 확정한 좌표와 표시명으로 노선에 더한다", async () => {
    await 검색한다();
    mockAddStop.mockResolvedValue(detail);

    fireEvent.click(screen.getByRole("button", { name: "이 위치로 추가" }));

    await waitFor(() =>
      expect(mockAddStop).toHaveBeenCalledWith(1, {
        lat: 37.5,
        lng: 127.0,
        name: "서울시 테스트로 12",
        address: "서울시 테스트로 12",
      }),
    );
  });

  // 핀을 옮기면 "이미 있다" 판정도 **옮긴 지점 기준**이어야 한다 — 검색 지점 기준 거리를 그대로
  // 두면, 관계자가 중복을 피하려고 옮겼는데도 경고가 그대로 남아 판단을 흐린다.
  it("핀을 옮기면 가까운 승하차지 거리도 그 지점 기준으로 다시 잰다", async () => {
    mockGetDetail.mockResolvedValue(detail);
    mockGetRoutePath.mockResolvedValue(emptyPath);
    mockSearch.mockResolvedValue({
      ...검색결과,
      nearby: [
        { stopId: 9, name: "이미 있는 자리", address: "서울시 테스트로 12", lat: 37.5, lng: 127.0, distanceM: 12 },
      ],
    });
    render(<RouteStopsPanel routeId={1} />);
    await screen.findByText("정문");
    fireEvent.change(screen.getByLabelText("도로명 주소로 검색"), { target: { value: "테스트로 12" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(await screen.findByText(/이미 있는 자리/)).toBeInTheDocument();

    // 약 100m 북쪽으로 옮기면 50m 밖이라 경고가 사라진다.
    mapProps[mapProps.length - 1].onMapClick?.({ lat: 37.5009, lng: 127.0 });

    await waitFor(() => expect(screen.queryByText(/이미 있는 자리/)).not.toBeInTheDocument());
  });

  it("50m 안에 기존 승하차지가 있으면 알려준다 — 같은 자리에 둘을 만들지 않게", async () => {
    mockGetDetail.mockResolvedValue(detail);
    mockGetRoutePath.mockResolvedValue(emptyPath);
    mockSearch.mockResolvedValue({
      ...검색결과,
      // 약 12m 북쪽 — 화면은 **서버 값이 아니라 지금 핀 기준**으로 다시 재서 보여준다.
      nearby: [
        { stopId: 9, name: "이미 있는 자리", address: "서울시 테스트로 12", lat: 37.50011, lng: 127.0, distanceM: 999 },
      ],
    });
    render(<RouteStopsPanel routeId={1} />);
    await screen.findByText("정문");

    fireEvent.change(screen.getByLabelText("도로명 주소로 검색"), { target: { value: "테스트로 12" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(await screen.findByText(/이미 있는 자리/)).toBeInTheDocument();
    expect(screen.getByText(/12m/)).toBeInTheDocument();
  });
});

// 사용자 지시(2026-09-22) — ①정차지 목록은 드래그로 순서를 바꾼다 ②"정차지 ID 로 추가" 는 없앤다
// (주소 검색이 대체한다).
describe("RouteStopsPanel — 드래그 정렬 · 개발자용 입력 제거", () => {
  afterEach(() => {
    mapProps.length = 0;
    vi.clearAllMocks();
  });

  const 화면을_띄운다 = async () => {
    mockGetDetail.mockResolvedValue(detail);
    mockGetRoutePath.mockResolvedValue(emptyPath);
    render(<RouteStopsPanel routeId={1} />);
    await screen.findByText("정문");
  };

  it("정차지 ID 로 추가 입력이 없다 — 주소 검색이 대체한다", async () => {
    await 화면을_띄운다();

    expect(screen.queryByLabelText("정차지 ID 로 추가")).not.toBeInTheDocument();
  });

  it("행을 끌어다 놓으면 그 자리로 순서가 바뀐다", async () => {
    await 화면을_띄운다();

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByText("정문")).toBeInTheDocument();

    // 두 번째 행(후문)을 첫 자리로 끌어다 놓는다.
    fireEvent.dragStart(rows[1]);
    fireEvent.dragOver(rows[0]);
    fireEvent.drop(rows[0]);

    const reordered = screen.getAllByRole("listitem");
    expect(within(reordered[0]).getByText("후문")).toBeInTheDocument();
    expect(within(reordered[1]).getByText("정문")).toBeInTheDocument();
  });

  it("드래그로 바꾼 순서도 저장을 눌러야 서버에 간다", async () => {
    await 화면을_띄운다();
    mockUpdateRoute.mockResolvedValue(detail);

    const rows = screen.getAllByRole("listitem");
    fireEvent.dragStart(rows[1]);
    fireEvent.drop(rows[0]);
    expect(mockUpdateRoute).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "정차 순서 저장" }));

    await waitFor(() => expect(mockUpdateRoute).toHaveBeenCalledWith(1, { stopIds: [2, 1] }));
  });
});
