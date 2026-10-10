import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MapSurfaceProps } from "@/features/map";
import { ApiError } from "@/shared/lib/http";
import { getAllStops, getStops, updateStop } from "../api";
import type { StopListItemTypes, StopSuggestionTypes } from "../types";
import { StopManagement } from "./StopManagement";

// Ruling 849 · §5.9 "승하차지 관리" — 목록(GET /staff/stops) · 수정(PATCH /staff/stops/{id}) 화면.
// 서버 계약은 api 시험이 맡고, 여기서는 화면이 무엇을 부르고 무엇을 보여 주는지만 고정한다.
vi.mock("../api", () => ({ getAllStops: vi.fn(), getStops: vi.fn(), updateStop: vi.fn(), suggestStops: vi.fn() }));

// jsdom 은 네이버 지도 SDK 를 못 그리므로 지도는 목으로 바꾸고, 핀을 끌어 놓은 일은 onMarkerDragEnd 로 흉내 낸다.
const mockMapSurface = vi.fn<(props: MapSurfaceProps) => null>(() => null);
vi.mock("@/features/map", () => ({
  MAP_SURFACE_HEIGHT: "280px",
  MapSurface: (props: MapSurfaceProps) => mockMapSurface(props),
}));

// 주소 자동완성은 RouteStopsPanel 과 같은 컴포넌트다 — 여기서는 후보를 고른 결과만 흉내 낸다.
let pendingSuggestion: StopSuggestionTypes;
vi.mock("./StopAddressSearch", () => ({
  StopAddressSearch: ({ onPick }: { onPick: (suggestion: StopSuggestionTypes) => void }) => (
    <button type="button" onClick={() => onPick(pendingSuggestion)}>
      후보 고르기
    </button>
  ),
}));

const mockGetStops = vi.mocked(getStops);
const mockGetAllStops = vi.mocked(getAllStops);
const mockUpdateStop = vi.mocked(updateStop);

const stop = (overrides: Partial<StopListItemTypes> = {}): StopListItemTypes => ({
  stopId: "7",
  name: "신정역 2번 출구",
  address: "서울 양천구 신정동 1",
  lat: 37.52,
  lng: 126.83,
  routes: [
    { routeId: "3", busNo: "1호차", weekday: "mon", direction: "to_academy", active: true },
    { routeId: "4", busNo: "2호차", weekday: "tue", direction: "from_academy", active: false },
  ],
  studentCount: 4,
  ...overrides,
});
const pageOf = (items: StopListItemTypes[], page = 0, hasNext = false, totalCount = items.length) => ({
  items,
  page,
  size: 20,
  totalCount,
  hasNext,
});

const openEdit = async (name = "신정역 2번 출구") => {
  fireEvent.click(await screen.findByRole("button", { name: `${name} 수정` }));
  return screen.findByRole("dialog", { name: "승하차지 수정" });
};

beforeEach(() => {
  mockGetStops.mockResolvedValue(pageOf([stop()]));
  mockGetAllStops.mockResolvedValue([stop()]);
});
afterEach(() => vi.clearAllMocks());

describe("StopManagement — 목록", () => {
  it("처음에는 검색어 없이 0쪽을 요청하고 행에 이름·주소·쓰는 편성·이용 학생 수를 보여 준다", async () => {
    render(<StopManagement />);

    const row = (await screen.findByText("신정역 2번 출구")).closest("tr")!;
    expect(mockGetStops).toHaveBeenCalledWith(0, 20, "");
    expect(within(row).getByText("서울 양천구 신정동 1")).toBeInTheDocument();
    expect(within(row).getByText("1호차 · 월 · 등원")).toBeInTheDocument();
    expect(within(row).getByText("2호차 · 화 · 하원")).toBeInTheDocument();
    expect(within(row).getByText("4명")).toBeInTheDocument();
  });

  it("비활성 편성은 흐리게 표시하고 활성 편성은 그대로 둔다", async () => {
    render(<StopManagement />);

    expect(await screen.findByText("2호차 · 화 · 하원")).toHaveAttribute("data-active", "false");
    expect(screen.getByText("1호차 · 월 · 등원")).toHaveAttribute("data-active", "true");
  });

  // L4 — 흐림만으로는 상태를 전할 수 없다(색·농도만으로 말하지 않는다). 비활성 편성에는 글자 "비활성" 이 붙는다.
  it("비활성 편성 태그에는 '비활성' 글자가 붙고 활성 편성 태그에는 붙지 않는다", async () => {
    render(<StopManagement />);

    const inactive = (await screen.findByText("2호차 · 화 · 하원")).closest("span[data-active]") as HTMLElement;
    const active = screen.getByText("1호차 · 월 · 등원").closest("span[data-active]") as HTMLElement;

    expect(within(inactive).getByText("비활성")).toBeInTheDocument();
    expect(within(active).queryByText("비활성")).not.toBeInTheDocument();
  });

  it("쓰는 편성이 없는 승하차지는 '쓰는 편성 없음' 이다", async () => {
    mockGetStops.mockResolvedValue(pageOf([stop({ routes: [], studentCount: 0 })]));
    render(<StopManagement />);

    const row = (await screen.findByText("신정역 2번 출구")).closest("tr")!;
    expect(within(row).getByText("쓰는 편성 없음")).toBeInTheDocument();
    expect(within(row).getByText("0명")).toBeInTheDocument();
  });

  it("검색어를 내면 그 글자를 q 로 0쪽부터 다시 요청한다", async () => {
    render(<StopManagement />);
    await screen.findByText("신정역 2번 출구");

    fireEvent.change(screen.getByPlaceholderText("이름 · 주소로 검색"), { target: { value: "신정" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    await waitFor(() => expect(mockGetStops).toHaveBeenLastCalledWith(0, 20, "신정"));
  });

  it("다음 쪽으로 가면 같은 검색어로 1쪽을 요청한다", async () => {
    mockGetStops.mockResolvedValue(pageOf([stop()], 0, true, 41));
    render(<StopManagement />);
    await screen.findByText("신정역 2번 출구");

    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    await waitFor(() => expect(mockGetStops).toHaveBeenLastCalledWith(1, 20, ""));
  });

  it("새로 만들기·삭제 단추는 없고 새 승하차지는 노선 편성에서 만든다는 안내가 있다", async () => {
    render(<StopManagement />);
    await screen.findByText("신정역 2번 출구");

    expect(screen.queryByRole("button", { name: /추가|새로|등록|삭제/ })).not.toBeInTheDocument();
    expect(screen.getByText(/새 승하차지는 고정 노선 편성 화면에서 만듭니다/)).toBeInTheDocument();
  });

  it("머리 설명과 안내 줄은 고친 값이 학생 주소에 반영된다고 말하지 않고, 노선 표시에만 반영됨을 알린다(Ruling 858 ⑤)", async () => {
    render(<StopManagement />);
    await screen.findByText("신정역 2번 출구");

    expect(screen.getByText(/학생의 요일별 주소는 사본이라 바뀌지 않습니다/)).toBeInTheDocument();
    expect(screen.getByText(/그 승하차지를 쓰는 모든 노선의 표시에 반영됩니다/)).toBeInTheDocument();
    expect(screen.queryByText(/학생 주소가 함께 쓰는/)).not.toBeInTheDocument();
    expect(screen.queryByText(/모든 노선과 학생 주소에 반영/)).not.toBeInTheDocument();
  });

  it("검색 결과가 없으면 검색어를 넣은 빈 목록 문구를 보인다", async () => {
    mockGetStops.mockResolvedValue(pageOf([]));
    render(<StopManagement />);

    fireEvent.change(await screen.findByPlaceholderText("이름 · 주소로 검색"), { target: { value: "없는곳" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(await screen.findByText("'없는곳' 검색 결과가 없습니다")).toBeInTheDocument();
  });

  it("조회에 실패하면 오류 문구와 다시 시도 단추를 보이고, 누르면 다시 읽는다", async () => {
    mockGetStops.mockRejectedValueOnce(new Error("네트워크"));
    render(<StopManagement />);
    expect(await screen.findByText("승하차지를 불러오지 못했습니다")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("신정역 2번 출구")).toBeInTheDocument();
  });
});

describe("StopManagement — 수정", () => {
  it("행의 수정 단추는 현재 이름·주소와 반영 범위 안내가 든 양식을 연다", async () => {
    render(<StopManagement />);
    const dialog = await openEdit();

    expect(within(dialog).getByLabelText("표시명")).toHaveValue("신정역 2번 출구");
    expect(within(dialog).getByText(/서울 양천구 신정동 1/)).toBeInTheDocument();
    // Ruling 858 ⑤ — 요일별 주소는 주소·좌표 사본이라 안 바뀐다. 바뀌는 것은 그 승하차지를 쓰는 노선의 표시다
    expect(within(dialog).getByText(/이 승하차지를 쓰는 모든 노선의 표시에 함께 반영됩니다/)).toBeInTheDocument();
    expect(within(dialog).getByText(/학생의 요일별 주소는 바뀌지 않습니다/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/학생 주소에 함께 반영/)).not.toBeInTheDocument();
  });

  it("바뀐 것이 없으면 저장 단추가 꺼져 있다", async () => {
    render(<StopManagement />);
    const dialog = await openEdit();

    expect(within(dialog).getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("이름만 고치면 PATCH 에 이름만 싣고, 저장되면 양식을 닫고 목록을 다시 읽는다", async () => {
    mockUpdateStop.mockResolvedValue(stop({ name: "신정역 1번 출구" }));
    render(<StopManagement />);
    const dialog = await openEdit();

    fireEvent.change(within(dialog).getByLabelText("표시명"), { target: { value: "신정역 1번 출구" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() => expect(mockUpdateStop).toHaveBeenCalledWith("7", { name: "신정역 1번 출구" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockGetStops).toHaveBeenCalledTimes(2);
  });

  it("핀을 끌어 옮기면 이름·주소는 빼고 좌표 둘만 싣는다", async () => {
    mockUpdateStop.mockResolvedValue(stop({ lat: 37.521, lng: 126.831 }));
    render(<StopManagement />);
    const dialog = await openEdit();

    const props = mockMapSurface.mock.lastCall![0];
    props.onMarkerDragEnd!("draft-stop", { lat: 37.521, lng: 126.831 });
    fireEvent.click(await within(dialog).findByRole("button", { name: "저장" }));

    await waitFor(() => expect(mockUpdateStop).toHaveBeenCalledWith("7", { position: { lat: 37.521, lng: 126.831 } }));
  });

  it("주소 후보를 고르면 주소와 좌표를 싣고, 같은 값인 이름은 싣지 않는다", async () => {
    pendingSuggestion = { lat: 37.53, lng: 126.84, displayName: "서울 양천구 신정동 2", nearby: [] };
    mockUpdateStop.mockResolvedValue(stop());
    render(<StopManagement />);
    const dialog = await openEdit();

    fireEvent.click(within(dialog).getByRole("button", { name: "후보 고르기" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(mockUpdateStop).toHaveBeenCalledWith("7", { address: "서울 양천구 신정동 2", position: { lat: 37.53, lng: 126.84 } }),
    );
  });

  it("고른 후보 50m 안에 다른 승하차지가 있으면 합쳐지지 않는다는 안내를 보이고, 자기 자신은 세지 않는다", async () => {
    pendingSuggestion = {
      lat: 37.52,
      lng: 126.83,
      displayName: "서울 양천구 신정동 1",
      nearby: [
        { stopId: "7", name: "신정역 2번 출구", address: "서울 양천구 신정동 1", lat: 37.52, lng: 126.83, distanceM: 0 },
        { stopId: "9", name: "신정역 3번 출구", address: "서울 양천구 신정동 3", lat: 37.5201, lng: 126.83, distanceM: 11 },
      ],
    };
    render(<StopManagement />);
    const dialog = await openEdit();

    fireEvent.click(within(dialog).getByRole("button", { name: "후보 고르기" }));

    expect(within(dialog).getByText(/"신정역 3번 출구" 승하차지가 이미 있습니다/)).toBeInTheDocument();
    expect(within(dialog).getByText(/합쳐지지 않고 따로 남습니다/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/"신정역 2번 출구" 승하차지가 이미 있습니다/)).not.toBeInTheDocument();
  });

  // M-W3 — 주소를 고르면 핀도 후보 자리로 옮겨 가 좌표가 바뀐다. 운행 중 승하차지는 좌표를 못 고치므로(403) 되돌릴 길이 화면에 있어야 이름·주소만 고칠 수 있다.
  it("핀을 옮기지 않았으면 '핀 되돌리기' 단추가 없고, 끌어 옮기면 나타난다", async () => {
    render(<StopManagement />);
    const dialog = await openEdit();
    expect(within(dialog).queryByRole("button", { name: "핀 되돌리기" })).not.toBeInTheDocument();

    mockMapSurface.mock.lastCall![0].onMarkerDragEnd!("draft-stop", { lat: 37.521, lng: 126.831 });

    expect(await within(dialog).findByRole("button", { name: "핀 되돌리기" })).toBeInTheDocument();
  });

  // 0.5m 미만 이동은 거리 표시가 0m 로 반올림되지만 좌표는 달라서 PATCH 에 position 이 실린다(운행 중이면 403) — 되돌릴 길이 있어야 한다.
  it("핀을 0.5m 도 안 되게 옮겨도 좌표가 달라졌으면 '핀 되돌리기' 단추가 보인다", async () => {
    render(<StopManagement />);
    const dialog = await openEdit();

    mockMapSurface.mock.lastCall![0].onMarkerDragEnd!("draft-stop", { lat: 37.520001, lng: 126.83 });

    expect(await within(dialog).findByRole("button", { name: "핀 되돌리기" })).toBeInTheDocument();
  });

  it("주소를 고른 뒤 '핀 되돌리기' 를 누르면 좌표는 빼고 주소만 싣는다(운행 중 승하차지의 주소만 고치기)", async () => {
    pendingSuggestion = { lat: 37.53, lng: 126.84, displayName: "서울 양천구 신정동 2", nearby: [] };
    mockUpdateStop.mockResolvedValue(stop());
    render(<StopManagement />);
    const dialog = await openEdit();

    fireEvent.click(within(dialog).getByRole("button", { name: "후보 고르기" }));
    fireEvent.click(await within(dialog).findByRole("button", { name: "핀 되돌리기" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() => expect(mockUpdateStop).toHaveBeenCalledWith("7", { address: "서울 양천구 신정동 2" }));
    expect(within(dialog).queryByRole("button", { name: "핀 되돌리기" })).not.toBeInTheDocument();
  });

  it("핀을 되돌리면 지도 카메라도 원래 자리로 돌아간다", async () => {
    pendingSuggestion = { lat: 37.53, lng: 126.84, displayName: "서울 양천구 신정동 2", nearby: [] };
    render(<StopManagement />);
    const dialog = await openEdit();

    fireEvent.click(within(dialog).getByRole("button", { name: "후보 고르기" }));
    expect(mockMapSurface.mock.lastCall![0].camera).toMatchObject({ lat: 37.53, lng: 126.84 });
    fireEvent.click(await within(dialog).findByRole("button", { name: "핀 되돌리기" }));

    expect(mockMapSurface.mock.lastCall![0].camera).toMatchObject({ lat: 37.52, lng: 126.83 });
    expect(mockMapSurface.mock.lastCall![0].markers[0]).toMatchObject({ lat: 37.52, lng: 126.83 });
  });

  // L3 — QA-STF-26: 50m 안 다른 승하차지는 주소를 고를 때도, 핀만 끌어 옮길 때도 저장 전에 알린다.
  it("주소를 고르지 않고 핀만 다른 승하차지 50m 안으로 끌어도 저장 전에 알린다", async () => {
    mockGetAllStops.mockResolvedValue([
      stop(),
      stop({ stopId: "9", name: "신정역 3번 출구", address: "서울 양천구 신정동 3", lat: 37.5301, lng: 126.84, routes: [] }),
    ]);
    render(<StopManagement />);
    const dialog = await openEdit();
    await waitFor(() => expect(mockGetAllStops).toHaveBeenCalled());

    mockMapSurface.mock.lastCall![0].onMarkerDragEnd!("draft-stop", { lat: 37.5301, lng: 126.8401 });

    expect(await within(dialog).findByText(/"신정역 3번 출구" 승하차지가 이미 있습니다/)).toBeInTheDocument();
    expect(within(dialog).getByText(/합쳐지지 않고 따로 남습니다/)).toBeInTheDocument();
  });

  // 867 — 창을 열자마자는 원래 자리 50m 안의 다른 승하차지를 알리지 않는다. 핀을 옮기면 그때 알린다.
  it("열자마자는 원래 자리 50m 안 다른 승하차지를 알리지 않고, 핀을 옮기면 알린다", async () => {
    mockGetAllStops.mockResolvedValue([
      stop(),
      stop({ stopId: "9", name: "신정역 3번 출구", address: "서울 양천구 신정동 3", lat: 37.5201, lng: 126.83, routes: [] }),
    ]);
    render(<StopManagement />);
    const dialog = await openEdit();
    // 다른 승하차지 목록 응답이 도착할 시간을 준다 — 안 주면 경고가 없는 게 목록을 아직 못 받아서일 수 있다
    await act(async () => {});
    expect(within(dialog).queryByText(/승하차지가 이미 있습니다/)).not.toBeInTheDocument();

    mockMapSurface.mock.lastCall![0].onMarkerDragEnd!("draft-stop", { lat: 37.5201, lng: 126.8301 });

    expect(await within(dialog).findByText(/"신정역 3번 출구" 승하차지가 이미 있습니다/)).toBeInTheDocument();
  });

  it("핀을 끌어 놓은 자리가 다른 승하차지에서 50m 밖이면 알리지 않고, 자기 자신도 세지 않는다", async () => {
    mockGetAllStops.mockResolvedValue([
      stop(),
      stop({ stopId: "9", name: "신정역 3번 출구", lat: 37.5301, lng: 126.84, routes: [] }),
    ]);
    render(<StopManagement />);
    const dialog = await openEdit();
    await waitFor(() => expect(mockGetAllStops).toHaveBeenCalled());

    // 원래 자리(자기 자신)에서 약 11m · 다른 승하차지(37.5301, 126.84)에서는 1km 넘게 — 자기 자신을 세면 경고가 뜨는 자리다
    mockMapSurface.mock.lastCall![0].onMarkerDragEnd!("draft-stop", { lat: 37.5201, lng: 126.83 });

    await within(dialog).findByRole("button", { name: "핀 되돌리기" });
    expect(within(dialog).queryByText(/승하차지가 이미 있습니다/)).not.toBeInTheDocument();
  });

  it("다른 승하차지 목록을 못 읽으면 거리 확인을 못 했다고 알리되 저장은 막지 않는다", async () => {
    mockGetAllStops.mockRejectedValue(new Error("네트워크"));
    render(<StopManagement />);
    const dialog = await openEdit();

    expect(await within(dialog).findByText(/다른 승하차지와의 거리를 확인하지 못했습니다/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("표시명"), { target: { value: "신정역 1번 출구" } });
    expect(within(dialog).getByRole("button", { name: "저장" })).toBeEnabled();
  });

  it("403 CHANGE_WINDOW_CLOSED 안내는 '핀 되돌리기' 로 이름·주소만 저장하는 길을 가리킨다", async () => {
    mockUpdateStop.mockRejectedValue(new ApiError(403, "CHANGE_WINDOW_CLOSED", "변경 가능 시간이 지났습니다"));
    render(<StopManagement />);
    const dialog = await openEdit();

    mockMapSurface.mock.lastCall![0].onMarkerDragEnd!("draft-stop", { lat: 37.521, lng: 126.831 });
    fireEvent.click(await within(dialog).findByRole("button", { name: "저장" }));

    expect(await within(dialog).findByText(/핀 되돌리기/, { selector: "[role=alert] *" })).toBeInTheDocument();
  });

  it("403 CHANGE_WINDOW_CLOSED 는 운행 중이라 옮길 수 없다는 안내를 양식에 보이고 목록은 그대로 둔다", async () => {
    mockUpdateStop.mockRejectedValue(new ApiError(403, "CHANGE_WINDOW_CLOSED", "변경 가능 시간이 지났습니다"));
    render(<StopManagement />);
    const dialog = await openEdit();

    fireEvent.change(within(dialog).getByLabelText("표시명"), { target: { value: "신정역 1번 출구" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(await within(dialog).findByText(/운행 중인 회차가 서는 승하차지라 위치를 지금 옮길 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "승하차지 수정" })).toBeInTheDocument();
    expect(mockGetStops).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("신정역 2번 출구").length).toBeGreaterThan(0);
  });

  it("404 STOP_NOT_FOUND 는 없어졌다는 안내를 목록 위에 보이고 양식을 닫은 뒤 목록을 다시 읽는다", async () => {
    mockUpdateStop.mockRejectedValue(new ApiError(404, "STOP_NOT_FOUND", "승하차지를 찾을 수 없습니다"));
    render(<StopManagement />);
    const dialog = await openEdit();

    fireEvent.change(within(dialog).getByLabelText("표시명"), { target: { value: "신정역 1번 출구" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(await screen.findByText(/이미 없어졌거나 다른 학원의 승하차지입니다/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockGetStops).toHaveBeenCalledTimes(2);
  });

  it("그 밖의 저장 실패는 서버 문구를 양식에 보이고 입력한 값을 지키며 양식을 닫지 않는다", async () => {
    mockUpdateStop.mockRejectedValue(new ApiError(422, "VALIDATION_FAILED", "이름은 100자까지입니다"));
    render(<StopManagement />);
    const dialog = await openEdit();

    fireEvent.change(within(dialog).getByLabelText("표시명"), { target: { value: "신정역 1번 출구" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    expect(await within(dialog).findByText("이름은 100자까지입니다")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("표시명")).toHaveValue("신정역 1번 출구");
  });

  it("취소하면 아무것도 보내지 않고 양식을 닫는다", async () => {
    render(<StopManagement />);
    const dialog = await openEdit();

    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockUpdateStop).not.toHaveBeenCalled();
  });
});
