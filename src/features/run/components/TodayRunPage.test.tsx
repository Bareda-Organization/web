import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import type { MapSurfaceProps } from "@/features/map";
import { TodayRunPage } from "./TodayRunPage";
import { getDashboard, getRunRoster, getRunsLive } from "../api";
import type { DashboardResponseTypes, RosterItemResponseTypes, RunsLiveResponseTypes } from "../types";

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
  getRunsLive: vi.fn(),
  postForcedAdd: vi.fn(),
  getManagers: vi.fn(),
  patchRunAssignment: vi.fn(),
}));

// 목표 3 — jsdom 은 <script src> 를 로드하지 않고(vitest.config.ts 에 `resources: "usable"`
// 미설정) NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 도 시험 환경에 없어, 실제 NaverMapSurface 는
// 항상 키 누락 경로로 빠져 SDK 마커 생성까지 검증할 수 없다(한계, 보고서 §1). 그래서
// `MapSurface` 자체를 목으로 바꿔 TodayRunPage 가 계산한 markers·camera 값이 그 컴포넌트에
// 무엇으로 전달되는지만 검증한다 — SDK 렌더링이 아니라 "이 화면의 계산 로직"의 검증이다.
const mockMapSurface = vi.fn((_props: MapSurfaceProps) => null);
vi.mock("@/features/map", () => ({
  MapSurface: (props: MapSurfaceProps) => mockMapSurface(props),
}));

const mockGetDashboard = vi.mocked(getDashboard);
const mockGetRunRoster = vi.mocked(getRunRoster);
const mockGetRunsLive = vi.mocked(getRunsLive);

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

// 목표 2 — §5.18 position 이 지도 마커·"현재 위치" 카드에 정확히 반영되는지 검증한다.
describe("TodayRunPage — 버스 위치(§5.18)", () => {
  afterEach(() => {
    mockRunIdParam = null;
    vi.clearAllMocks();
  });

  it("position 이 있으면 그 좌표로 버스 마커를 지도에 전달한다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    const liveResponse: RunsLiveResponseTypes = {
      runs: [
        {
          runId: 7,
          busNo: "2호차",
          direction: "to_academy",
          status: "moving",
          position: { lat: 37.55, lng: 127.01, recordedAt: "2026-09-17T08:05:00+09:00" },
          currentStop: "3번 정류장",
          nextStop: "후문",
          progress: { done: 3, total: 6 },
          delayMinutes: null,
          driverName: "박기사",
          escortName: "최매니저",
          lastSeenAt: null,
        },
      ],
    };
    mockGetRunsLive.mockResolvedValue(liveResponse);
    render(<TodayRunPage />);

    await waitFor(() =>
      expect(mockMapSurface).toHaveBeenCalledWith(
        expect.objectContaining({
          markers: [{ id: "7", lat: 37.55, lng: 127.01, kind: "bus" }],
          camera: { lat: 37.55, lng: 127.01, zoom: 12 },
        }),
      ),
    );
    expect(await screen.findByText("현재 3번 정류장 → 다음 후문")).toBeInTheDocument();
  });

  it("position 이 null 이고 lastSeenAt 만 있으면 마커 없이 최근 확인 문구를 보여준다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({
      runs: [
        {
          runId: 7,
          busNo: "2호차",
          direction: "to_academy",
          status: "moving",
          position: null,
          currentStop: null,
          nextStop: null,
          progress: { done: 0, total: 6 },
          delayMinutes: null,
          driverName: "박기사",
          escortName: "최매니저",
          lastSeenAt: "08:02",
        },
      ],
    });
    render(<TodayRunPage />);

    expect(await screen.findByText("최근 확인 08:02")).toBeInTheDocument();
    expect(mockMapSurface).toHaveBeenCalledWith(expect.objectContaining({ markers: [] }));
  });

  it("해당 회차가 §5.18 응답에 없으면(대기 중) 위치 확인 대기 문구를 보여준다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    render(<TodayRunPage />);

    expect(await screen.findByText("위치 확인 대기")).toBeInTheDocument();
    expect(mockMapSurface).toHaveBeenCalledWith(expect.objectContaining({ markers: [] }));
  });
});
