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
});
