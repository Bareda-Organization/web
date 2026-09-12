import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { DashboardPage } from "./DashboardPage";
import { getDashboard, getRunsLive } from "../api";
import type { DashboardResponseTypes, RunsLiveResponseTypes } from "../types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// §5.3 응답 지표·회차 목록 렌더와 §5.3 noShowCases 기반 배너 노출이 이 화면의 핵심
// 검증 대상이다. §5.18 폴링(getRunsLive)은 실패해도 본문 오류로 승격되지 않아야 한다.
vi.mock("../api", () => ({
  getDashboard: vi.fn(),
  getRunsLive: vi.fn(),
}));

const mockGetDashboard = vi.mocked(getDashboard);
const mockGetRunsLive = vi.mocked(getRunsLive);

const emptyLive: RunsLiveResponseTypes = { runs: [] };

const baseDashboard: DashboardResponseTypes = {
  metrics: { movingBuses: 3, boarded: 42, noShow: 1, absent: 2, unassignedManagers: 0 },
  runs: [
    {
      runId: 1,
      busNo: "1호차",
      direction: "to_academy",
      departTime: "08:00",
      driverName: "김기사",
      escortName: null,
      boardedCount: 10,
      totalCount: 12,
      runStatus: "moving",
      addedCount: 0,
      removedCount: 0,
      ackDriver: true,
      ackEscort: false,
      noShowCases: [],
    },
  ],
};

describe("DashboardPage — 지표·회차 목록·미탑승 배너", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("대시보드를 불러와 지표와 회차 목록을 보여준다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue(emptyLive);
    render(<DashboardPage />);

    expect(await screen.findByText("1호차")).toBeInTheDocument();
    expect(screen.getByText("김기사")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("미탑승 확인 대기 건이 있으면 배너로 건수를 보여준다", async () => {
    mockGetDashboard.mockResolvedValue({
      ...baseDashboard,
      runs: [
        {
          ...baseDashboard.runs[0],
          noShowCases: [{ studentName: "이학생", stopName: "정문", expiresAt: "2026-09-12T09:00:00Z" }],
        },
      ],
    });
    mockGetRunsLive.mockResolvedValue(emptyLive);
    render(<DashboardPage />);

    expect(await screen.findByText("미탑승 확인 대기 1건")).toBeInTheDocument();
  });

  it("대시보드 조회에 실패하면 오류 배너를 보여준다", async () => {
    mockGetDashboard.mockRejectedValue(new ApiError(500, "INTERNAL", "대시보드 서버 오류"));
    mockGetRunsLive.mockResolvedValue(emptyLive);
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText("대시보드 서버 오류")).toBeInTheDocument());
  });

  // §5.18 폴링(getRunsLive, 7초 간격)은 화면을 떠난 뒤에도 계속 돌면 요청이 쌓이고
  // 여러 화면을 오갈수록 겹친다 — 언마운트 시 setInterval 로 만든 타이머를 실제로
  // clearInterval 하는지를 이 검사 하나가 무는 유일한 대상이다. 콜백 안의 cancelled
  // 플래그만으로는 이 결함을 못 잡는다(호출은 막아도 타이머 자체는 계속 살아있다) —
  // 그래서 호출 횟수가 아니라 clearInterval 이 그 타이머 id 로 불렸는지를 직접 본다.
  it("언마운트하면 폴링에 쓰던 setInterval 타이머를 clearInterval 로 정리한다", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue(emptyLive);

    // render() 는 act() 로 감싸여 있어 초기 렌더의 useEffect(그 안의 setInterval 호출 포함)가
    // 이 시점에 이미 동기적으로 반영돼 있다 — waitFor 는 필요 없다(오히려 waitFor 자신도
    // 내부적으로 setInterval 로 폴링해 이 스파이에 잡히므로 호출 수를 오염시킨다).
    const { unmount } = render(<DashboardPage />);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    const timerId = setIntervalSpy.mock.results[0]!.value;

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(timerId);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
