import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStableRouter } from "@/shared/testing/stableRouter";
import { getRuns, getSchedules } from "@/features/schedule";
import { getRouteDetail, getRoutePath, getRoutes } from "../api";
import type { RouteDetailResponseTypes } from "../types";
import { RouteDetail } from "./RouteDetail";

const mockRouter = createStableRouter();
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
vi.mock("../api", () => ({ getRouteDetail: vi.fn(), getRoutes: vi.fn(), getRoutePath: vi.fn() }));
vi.mock("@/features/schedule", () => ({ getSchedules: vi.fn(), getRuns: vi.fn() }));

// 승하차지 패널이 언마운트됐다 다시 마운트되는지만 본다 — 저장 전 편집은 패널 상태에 있다.
const mounts = vi.fn();
vi.mock("./RouteStopsPanel", () => ({
  RouteStopsPanel: () => {
    useEffect(() => {
      mounts();
    }, []);
    return <p>승하차지 패널</p>;
  },
}));
vi.mock("./RouteForm", () => ({
  RouteForm: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>수정 저장</button>,
}));

const mockGetDetail = vi.mocked(getRouteDetail);
const mockGetRoutes = vi.mocked(getRoutes);
const mockGetPath = vi.mocked(getRoutePath);
const mockGetSchedules = vi.mocked(getSchedules);
const mockGetRuns = vi.mocked(getRuns);

const detail: RouteDetailResponseTypes = {
  id: "1",
  busId: "3",
  busNo: "1호차",
  weekday: "mon",
  direction: "to_academy",
  name: "본선",
  active: true,
  stops: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDetail.mockResolvedValue(detail);
  mockGetRoutes.mockResolvedValue({ items: [], page: 0, size: 500, totalCount: 0, hasNext: false });
  mockGetPath.mockRejectedValue(new Error("경로 없음"));
  mockGetSchedules.mockResolvedValue({ items: [], page: 0, size: 500, totalCount: 0, hasNext: false });
  mockGetRuns.mockResolvedValue({ items: [] });
});

describe("RouteDetail — F02-11 편성 정보 수정 뒤에도 승하차지 편집이 남는다", () => {
  it("편성 정보를 저장해 상세를 다시 불러와도 승하차지 패널은 다시 마운트되지 않는다", async () => {
    render(<RouteDetail routeId="1" />);
    const panel = await screen.findByText("승하차지 패널");
    // effect 는 화면이 그려진 뒤에 돈다 — 요소가 보이는 순간 mounts 가 이미 불렸다고 가정하면 부하가 높을 때 0 번으로 읽힌다.
    await waitFor(() => expect(mounts).toHaveBeenCalledTimes(1));

    mockGetDetail.mockResolvedValue({ ...detail, name: "새 이름" });
    fireEvent.click(screen.getByRole("button", { name: "편성 정보 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }));

    await waitFor(() => expect(screen.getByText("새 이름")).toBeInTheDocument());
    // 다시 마운트되면 DOM 요소가 새로 만들어진다 — 처음 요소가 그대로면 effect 시점과 무관하게 재마운트가 없다.
    expect(screen.getByText("승하차지 패널")).toBe(panel);
    expect(mounts).toHaveBeenCalledTimes(1);
  });
});

// R48 — 지표 4칸: 이용 학생(정차지 rider_count 합) · 예상 소요(path) · 연결된 스케줄(같은 차량·요일·방향). 보조 재료를 못 받으면 `-`.
describe("RouteDetail — 지표 · 요일 탭", () => {
  const withStops: RouteDetailResponseTypes = {
    ...detail,
    stops: [
      { stopId: "1", seq: 1, name: "벽산", lat: 0, lng: 0, riderCount: 2 },
      { stopId: "2", seq: 2, name: "청구", lat: 0, lng: 0, riderCount: 3 },
    ],
  };

  it("서버 값에서 이용 학생 합 · 예상 소요 · 스케줄 출발 시각을 보이고, 같은 차량의 다른 요일 탭은 그 편성으로 옮겨 간다", async () => {
    mockGetDetail.mockResolvedValue(withStops);
    mockGetPath.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], distanceM: 12400, durationS: 1980, computedAt: "2026-10-03T12:02:00+09:00" });
    mockGetRoutes.mockResolvedValue({
      items: [
        { ...detail, stopCount: 2 },
        { ...detail, id: "9", weekday: "tue", stopCount: 7 },
      ],
      page: 0, size: 500, totalCount: 2, hasNext: false,
    });
    mockGetSchedules.mockResolvedValue({
      items: [{ id: "4", busId: detail.busId, weekday: detail.weekday, direction: detail.direction, departTime: "2026-10-03T18:20:00+09:00", originName: "", destinationName: "", estDurationMin: null, active: true }] as never,
      page: 0, size: 500, totalCount: 1, hasNext: false,
    });
    render(<RouteDetail routeId="1" />);

    await screen.findByText("승하차지 패널");
    await waitFor(() => expect(screen.getByText("이용 학생").parentElement).toHaveTextContent("5명"));
    expect(screen.getByText("예상 소요").parentElement).toHaveTextContent("33분");
    expect(screen.getByText("예상 소요").parentElement).toHaveTextContent("도로 12.4km");
    expect(screen.getByText("연결된 스케줄").parentElement).toHaveTextContent("18:20");

    fireEvent.click(screen.getByRole("tab", { name: /^화/ }));
    expect(mockRouter.push).toHaveBeenCalledWith("/route/9");
  });

  it("경로 · 스케줄을 못 받으면 해당 칸만 -", async () => {
    mockGetDetail.mockResolvedValue(withStops);
    render(<RouteDetail routeId="1" />);

    await screen.findByText("승하차지 패널");
    expect(screen.getByText("예상 소요").parentElement).toHaveTextContent("-");
    expect(screen.getByText("연결된 스케줄").parentElement).toHaveTextContent("-");
    expect(screen.getByText("승하차지").parentElement).toHaveTextContent("2곳");
  });
});
