import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { getRunRoute } from "@/features/route";
import type { RunRouteResponseTypes } from "@/features/route";
import { deleteWaypoint, postWaypoint } from "../api";
import type { WaypointResponseTypes } from "../types";
import { RunWaypointPanel } from "./RunWaypointPanel";

// Ruling 893 — 경유 지점은 "미리보기 → 배포" 두 단계다. 이 시험의 핵심은 ①미리보기 없이 배포가 안 되는 것 ②배포가 그 미리보기의 토큰·지점·자리를 그대로 싣는 것
// ③오류마다 안내 문구가 나오고 목록이 서버 값으로 새로 읽히는 것이다.
vi.mock("../api", () => ({ postWaypoint: vi.fn(), deleteWaypoint: vi.fn() }));

// 주소 검색 상자 자체는 StopAddressSearch.test.tsx 가 본다 — 여기서는 고른 후보가 요청에 실리는 흐름만 본다.
vi.mock("@/features/route", () => ({
  getRunRoute: vi.fn(),
  StopAddressSearch: ({ onPick }: { onPick: (suggestion: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onPick({ placeName: "신정역 주유소", displayName: "서울 양천구 목동동로 257", lat: 37.51, lng: 127.01, nearby: [] })
      }
    >
      주소 후보 고르기
    </button>
  ),
}));

vi.mock("@/features/map", () => ({
  MAP_SURFACE_HEIGHT: "480px",
  MapSurface: ({ polylines }: { polylines?: { points: unknown[] }[] }) => <div data-testid="map" data-points={polylines?.[0]?.points.length ?? 0} />,
}));

const mockGetRunRoute = vi.mocked(getRunRoute);
const mockPost = vi.mocked(postWaypoint);
const mockDelete = vi.mocked(deleteWaypoint);

const stop = (stopId: string, seq: number, name: string, extra: Record<string, unknown> = {}) => ({
  stopId,
  seq,
  name,
  lat: 37.5,
  lng: 127.0,
  isDestination: false,
  isWaypoint: false,
  waypointId: null,
  change: null,
  ...extra,
});

const route: RunRouteResponseTypes = {
  roadPath: [],
  fallbackUsed: false,
  confirmed: true,
  stops: [
    stop("1", 1, "가"),
    stop("2", 2, "나"),
    stop("9", 3, "주유소", { isWaypoint: true, waypointId: "55" }),
    stop("0", 4, "학원", { isDestination: true }),
  ],
};

const preview = (overrides: Partial<WaypointResponseTypes> = {}): WaypointResponseTypes => ({
  waypointId: "56",
  previewToken: "tok-1",
  applied: false,
  routePreview: {
    stopsBefore: [{ seq: 1, stopName: "가", eta: "2026-10-13T07:10:00+09:00", lat: 37.5, lng: 127.0 }],
    stopsAfter: [
      { seq: 1, stopName: "가", eta: "2026-10-13T07:10:00+09:00", lat: 37.5, lng: 127.0 },
      { seq: 2, stopName: "신정역 주유소", eta: "2026-10-13T07:15:00+09:00", lat: 37.51, lng: 127.01 },
    ],
    reordered: [{ stopId: "2", stopName: "나" }],
    removed: [],
    roadPathBefore: [{ lat: 37.5, lng: 127.0 }],
    roadPathAfter: [
      { lat: 37.5, lng: 127.0 },
      { lat: 37.51, lng: 127.01 },
    ],
  },
  estDurationBefore: 20,
  estDurationAfter: 24,
  estDistanceBefore: 4.2,
  estDistanceAfter: 5,
  ...overrides,
});

const renderPanel = () => {
  const onChanged = vi.fn();
  render(<RunWaypointPanel runId="7" onClose={vi.fn()} onChanged={onChanged} />);
  return { onChanged };
};

// 주소 후보를 고르고 "나 다음" 자리를 정한 뒤 [미리보기] 를 누른다.
const requestAddPreview = async () => {
  await screen.findByRole("button", { name: "주유소 삭제" });
  fireEvent.click(screen.getByRole("button", { name: "주소 후보 고르기" }));
  fireEvent.change(screen.getByLabelText("넣을 자리"), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "미리보기" }));
  await screen.findByRole("button", { name: "배포" });
};

describe("RunWaypointPanel", () => {
  beforeEach(() => {
    mockGetRunRoute.mockResolvedValue(route);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("경유 행에만 [삭제] 가 있고, 승하차지 · 학원 행에는 없다", async () => {
    renderPanel();

    expect(await screen.findByRole("button", { name: "주유소 삭제" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /삭제$/ })).toHaveLength(1);
  });

  it("넣을 자리는 서버가 받는 범위(맨 앞 · 각 승하차지 다음 · 맨 뒤)만 고르게 하고, 맨 뒤는 seq 를 싣지 않는다", async () => {
    mockPost.mockResolvedValue(preview());
    renderPanel();
    await screen.findByRole("button", { name: "주유소 삭제" });

    const options = within(screen.getByLabelText("넣을 자리")).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["맨 앞", "가 다음", "나 다음", "맨 뒤 (기본)"]);

    fireEvent.click(screen.getByRole("button", { name: "주소 후보 고르기" }));
    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost.mock.calls[0][1]).not.toHaveProperty("seq");
  });

  it("미리보기 전에는 [배포] 가 없고, 주소를 고르기 전에는 [미리보기] 가 막혀 있다", async () => {
    renderPanel();
    await screen.findByRole("button", { name: "주유소 삭제" });

    expect(screen.queryByRole("button", { name: "배포" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "미리보기" })).toBeDisabled();
  });

  it("주소를 고르면 표시명이 장소 이름으로 채워지고 고칠 수 있다", async () => {
    renderPanel();
    await screen.findByRole("button", { name: "주유소 삭제" });
    fireEvent.click(screen.getByRole("button", { name: "주소 후보 고르기" }));

    const label = screen.getByLabelText(/표시명/);
    expect(label).toHaveValue("신정역 주유소");
    fireEvent.change(label, { target: { value: "목동 주유소" } });
    expect(label).toHaveValue("목동 주유소");
  });

  it("미리보기(apply=false)는 주소 · 좌표 · 표시명 · 자리를 싣고, 전후 소요시간과 알림 안내를 보인다", async () => {
    mockPost.mockResolvedValue(preview());
    renderPanel();

    await requestAddPreview();

    expect(mockPost).toHaveBeenCalledWith("7", {
      address: "서울 양천구 목동동로 257",
      lat: 37.51,
      lng: 127.01,
      label: "신정역 주유소",
      seq: 3,
      apply: false,
    });
    expect(screen.getByText(/20분 → 24분/)).toBeInTheDocument();
    expect(screen.getByText(/4\.2km → 5\.0km/)).toBeInTheDocument();
    expect(screen.getByText("순서가 바뀌는 승하차지").parentElement).toHaveTextContent("나");
    expect(screen.getAllByTestId("map")).toHaveLength(2);
    expect(screen.getByText("배포하면 기사 · 동승자에게 알림이 가요")).toBeInTheDocument();
  });

  it("[배포] 는 미리보기의 preview_token 과 같은 지점 · 자리를 apply=true 로 보내고, 끝나면 목록을 새로 읽는다", async () => {
    mockPost.mockResolvedValueOnce(preview()).mockResolvedValueOnce(preview({ applied: true, previewToken: null }));
    const { onChanged } = renderPanel();
    await requestAddPreview();
    const routeCallsBefore = mockGetRunRoute.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "배포" }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(2));
    expect(mockPost.mock.calls[1]).toEqual([
      "7",
      { address: "서울 양천구 목동동로 257", lat: 37.51, lng: 127.01, label: "신정역 주유소", seq: 3, apply: true, previewToken: "tok-1" },
    ]);
    await waitFor(() => expect(mockGetRunRoute.mock.calls.length).toBeGreaterThan(routeCallsBefore));
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "배포" })).not.toBeInTheDocument();
  });

  it("미리보기를 닫으면 버려지고 배포 요청이 나가지 않는다", async () => {
    mockPost.mockResolvedValue(preview());
    renderPanel();
    await requestAddPreview();

    fireEvent.click(screen.getByRole("button", { name: "미리보기 닫기" }));

    expect(screen.queryByRole("button", { name: "배포" })).not.toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it("삭제도 같은 미리보기 → 배포이고, 배포는 삭제 미리보기의 토큰을 쿼리로 보낸다", async () => {
    mockDelete.mockResolvedValueOnce(preview({ waypointId: "55", previewToken: "tok-d" })).mockResolvedValueOnce(preview({ applied: true, previewToken: null }));
    const { onChanged } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "주유소 삭제" }));
    await screen.findByRole("button", { name: "배포" });
    expect(mockDelete).toHaveBeenCalledWith("7", "55", { apply: false });

    fireEvent.click(screen.getByRole("button", { name: "배포" }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(2));
    expect(mockDelete.mock.calls[1]).toEqual(["7", "55", { apply: true, previewToken: "tok-d" }]);
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it("403 CHANGE_WINDOW_CLOSED 는 마감 안내를 보이고 목록을 새로 읽는다", async () => {
    mockPost.mockRejectedValue(new ApiError(403, "CHANGE_WINDOW_CLOSED", "원문"));
    renderPanel();
    await screen.findByRole("button", { name: "주유소 삭제" });
    const routeCallsBefore = mockGetRunRoute.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "주소 후보 고르기" }));

    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));

    expect(await screen.findByText(/변경 마감 시각이 지나/)).toBeInTheDocument();
    await waitFor(() => expect(mockGetRunRoute.mock.calls.length).toBeGreaterThan(routeCallsBefore));
  });

  it("배포 중 403 CHANGE_WINDOW_CLOSED 면 미리보기를 버려 [배포] 를 다시 누를 수 없다", async () => {
    mockPost.mockResolvedValueOnce(preview()).mockRejectedValueOnce(new ApiError(403, "CHANGE_WINDOW_CLOSED", "원문"));
    renderPanel();
    await requestAddPreview();

    fireEvent.click(screen.getByRole("button", { name: "배포" }));

    expect(await screen.findByText(/변경 마감 시각이 지나/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "배포" })).not.toBeInTheDocument();
    expect(screen.queryByText("추가 미리보기")).not.toBeInTheDocument();
  });

  it("409 PREVIEW_STALE 은 낡은 미리보기를 버리고 다시 미리보기를 누르게 한다", async () => {
    mockPost.mockResolvedValueOnce(preview()).mockRejectedValueOnce(new ApiError(409, "PREVIEW_STALE", "원문"));
    renderPanel();
    await requestAddPreview();

    fireEvent.click(screen.getByRole("button", { name: "배포" }));

    expect(await screen.findByText(/다시 미리보기를 눌러/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "배포" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "미리보기" })).toBeEnabled();
  });

  it("409 RUN_NOT_CONFIRMED 와 422 ROUTE_NOT_CONFIGURED_FOR_RUN 은 고칠 곳을 알린다", async () => {
    mockPost.mockRejectedValueOnce(new ApiError(409, "RUN_NOT_CONFIRMED", "원문")).mockRejectedValueOnce(new ApiError(422, "ROUTE_NOT_CONFIGURED_FOR_RUN", "원문"));
    renderPanel();
    await screen.findByRole("button", { name: "주유소 삭제" });
    fireEvent.click(screen.getByRole("button", { name: "주소 후보 고르기" }));

    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));
    expect(await screen.findByText(/아직 확정되지 않은 회차/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "미리보기" }));
    expect(await screen.findByText(/노선 편성에서/)).toBeInTheDocument();
  });
});
