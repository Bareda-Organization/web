import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { TodayRunPage } from "./TodayRunPage";
import { getDashboard, getRunRoster } from "../api";
import type { DashboardResponseTypes, RosterItemResponseTypes } from "../types";

// §5.4 는 runId 쿼리가 없으면 첫 회차로 리다이렉트해 명단을 불러오는 것이 진입점의
// 핵심 동작이다. absent 는 매니저 앱과 반대로 계속 결측(missed) 로 보여야 한다는
// 화면 전용 규칙(TodayRunPage.tsx 주석)도 함께 검증한다.
const mockReplace = vi.fn();
let mockRunIdParam: string | null = null;
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => ({ get: () => mockRunIdParam }),
}));

vi.mock("../api", () => ({
  getDashboard: vi.fn(),
  getRunRoster: vi.fn(),
  postForcedAdd: vi.fn(),
  getManagers: vi.fn(),
  patchRunAssignment: vi.fn(),
}));

const mockGetDashboard = vi.mocked(getDashboard);
const mockGetRunRoster = vi.mocked(getRunRoster);

const baseDashboard: DashboardResponseTypes = {
  metrics: { movingBuses: 1, boarded: 1, noShow: 0, absent: 0, unassignedManagers: 0 },
  runs: [
    {
      runId: 7,
      busNo: "2호차",
      direction: "to_academy",
      departTime: "08:10",
      driverName: "박기사",
      escortName: "최매니저",
      boardedCount: 5,
      totalCount: 6,
      runStatus: "moving",
      addedCount: 0,
      removedCount: 0,
      ackDriver: true,
      ackEscort: true,
      noShowCases: [],
    },
  ],
};

const baseRoster: RosterItemResponseTypes[] = [
  {
    studentId: 1,
    name: "김학생",
    className: "1반",
    stopName: "정문",
    guardianPhone: "010-1234-5678",
    change: null,
    status: "absent",
    note: null,
  },
];

describe("TodayRunPage — 회차 선택·명단·결석 라벨", () => {
  afterEach(() => {
    mockRunIdParam = null;
    vi.clearAllMocks();
  });

  it("runId 쿼리가 없으면 첫 회차로 리다이렉트하고 그 회차의 명단을 불러온다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    render(<TodayRunPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/today-run?runId=7"));
    expect(await screen.findByText("김학생")).toBeInTheDocument();
    expect(mockGetRunRoster).toHaveBeenCalledWith(7);
  });

  it("결석 학생은 결석 라벨로 표시된다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    render(<TodayRunPage />);

    expect(await screen.findByText("결석")).toBeInTheDocument();
  });

  it("명단 조회에 실패하면 오류 배너를 보여준다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockRejectedValue(new ApiError(500, "INTERNAL", "명단 서버 오류"));
    render(<TodayRunPage />);

    await waitFor(() => expect(screen.getByText("명단 서버 오류")).toBeInTheDocument());
  });
});
