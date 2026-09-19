import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import type { MapSurfaceProps } from "@/features/map";
import { TodayRunPage } from "./TodayRunPage";
import { getDashboard, getRunRoster, getRunsLive } from "../api";
import { getRunRoute } from "@/features/route";
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

// R15-T2 목표 4 — §5.19 를 부르는 getRunRoute 는 features/route 를 통해서만 온다.
vi.mock("@/features/route", () => ({
  getRunRoute: vi.fn(),
}));

// 목표 3 — jsdom 은 <script src> 를 로드하지 않고(vitest.config.ts 에 `resources: "usable"`
// 미설정) NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 도 시험 환경에 없어, 실제 NaverMapSurface 는
// 항상 키 누락 경로로 빠져 SDK 마커 생성까지 검증할 수 없다(한계, 보고서 §1). 그래서
// `MapSurface` 자체를 목으로 바꿔 TodayRunPage 가 계산한 markers·camera 값이 그 컴포넌트에
// 무엇으로 전달되는지만 검증한다 — SDK 렌더링이 아니라 "이 화면의 계산 로직"의 검증이다.
const mockMapSurface = vi.fn((_props: MapSurfaceProps) => null);
// R18-B2 — `cameraForSelectedBus`·`buildRouteDisplayState` 는 실제 구현을 그대로
// 쓴다(순수 함수, SDK 무관). `MapSurface` 만 목으로 바꾼다.
vi.mock("@/features/map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/map")>();
  return {
    ...actual,
    MapSurface: (props: MapSurfaceProps) => mockMapSurface(props),
  };
});

const mockGetDashboard = vi.mocked(getDashboard);
const mockGetRunRoster = vi.mocked(getRunRoster);
const mockGetRunsLive = vi.mocked(getRunsLive);
const mockGetRunRoute = vi.mocked(getRunRoute);

// R15-T2 이전 시험은 getRunRoute 를 모른다 — 기본값을 비워 두어 기존 시험이
// "노선을 불러오지 못했습니다" 오류로 오염되지 않게 한다.
beforeEach(() => {
  mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [] });
});

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
          // R18-B2 목표 2 — 세 화면이 같은 확대 수준(16)을 쓴다. 이 화면은 항상 회차
          // 하나가 선택돼 있어(토글 없음) 마커가 있으면 곧 "선택된 버스" 다.
          camera: { lat: 37.55, lng: 127.01, zoom: 15 },
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

// R15-T2 §8.23 목표 3·4·5 — 우측 버스 목록은 4종 상태 전부를 보이고, 선택된
// 회차의 §5.19 노선을 지도에 그린다.
describe("TodayRunPage — 버스 목록 4종 상태·노선 표시(R15-T2)", () => {
  const fourStatusDashboard: DashboardResponseTypes = {
    metrics: baseDashboard.metrics,
    runs: [
      { ...baseDashboard.runs[0], runId: 7, busNo: "2호차", runStatus: "idle" },
      { ...baseDashboard.runs[0], runId: 8, busNo: "3호차", runStatus: "confirmed" },
      { ...baseDashboard.runs[0], runId: 9, busNo: "4호차", runStatus: "moving" },
      { ...baseDashboard.runs[0], runId: 10, busNo: "5호차", runStatus: "finished" },
    ],
  };

  afterEach(() => {
    mockRunIdParam = null;
    vi.clearAllMocks();
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [] });
  });

  it("idle·confirmed·moving·finished 4종 상태가 전부 목록에 남는다 — finished 도 걸러내지 않는다", async () => {
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    render(<TodayRunPage />);

    expect(await screen.findByText("2호차 · 등원")).toBeInTheDocument();
    expect(screen.getByText("3호차 · 등원")).toBeInTheDocument();
    expect(screen.getByText("4호차 · 등원")).toBeInTheDocument();
    expect(screen.getByText("5호차 · 등원")).toBeInTheDocument();
    expect(screen.getAllByText("대기").length).toBeGreaterThan(0);
    expect(screen.getAllByText("확정").length).toBeGreaterThan(0);
    expect(screen.getAllByText("운행 중").length).toBeGreaterThan(0);
    expect(screen.getAllByText("운행 종료").length).toBeGreaterThan(0);
  });

  it("버스 목록 항목을 클릭하면 그 회차로 이동한다", async () => {
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    render(<TodayRunPage />);

    fireEvent.click(await screen.findByText("5호차 · 등원"));

    expect(mockReplace).toHaveBeenCalledWith("/today-run?runId=10");
  });

  it("선택된 회차의 §5.19 노선을 지도에 그리고, 근사 경로면 안내한다", async () => {
    mockRunIdParam = "9";
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    mockGetRunRoute.mockResolvedValue({
      roadPath: [
        { lat: 37.1, lng: 127.1 },
        { lat: 37.2, lng: 127.2 },
      ],
      fallbackUsed: true,
      stops: [],
    });
    render(<TodayRunPage />);

    // runId 9(4호차)는 runStatus:"moving" — R20-C 목표 3, kind 가 상태를 따라간다.
    // `selectedRun` 이 runs 로딩 전엔 null 이라 loadRoute 이펙트가 두 번 걸린다
    // (idle 기본값 → 실제 상태) — waitFor 로 최종 렌더를 기다린다.
    expect(await screen.findByText("근사 경로")).toBeInTheDocument();
    expect(mockGetRunRoute).toHaveBeenCalledWith(9);
    await waitFor(() =>
      expect(mockMapSurface).toHaveBeenCalledWith(
        expect.objectContaining({
          polylines: [
            {
              id: "route-9",
              points: [
                { lat: 37.1, lng: 127.1 },
                { lat: 37.2, lng: 127.2 },
              ],
              kind: "moving",
              approximate: true,
            },
          ],
        }),
      ),
    );
  });

  // R18-B2 목표 2 — MonitoringPage.tsx·DashboardPage.tsx 와 같은 형태. runId 9(4호차)
  // 는 runStatus:"moving"(확정 이후)이라 좌표 0개는 "확정됐지만 없음"(데이터 결손)이다.
  it("경로 좌표가 0개면 확정됐지만 경로 정보가 아직 없습니다 를 보여주고 근사 경로 안내는 뜨지 않는다", async () => {
    mockRunIdParam = "9";
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [] });
    render(<TodayRunPage />);

    expect(await screen.findByText("확정됐지만 경로 정보가 아직 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("근사 경로")).not.toBeInTheDocument();
  });

  // R20-C 목표 4 — runId 7(2호차)은 runStatus:"idle" — 좌표 0개가 정상이다
  // (조율자 실측 — run 1·6).
  it("idle 회차(runId 7)를 고르면 아직 확정 전이라 노선이 없습니다 를 보여준다", async () => {
    mockRunIdParam = "7";
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [] });
    render(<TodayRunPage />);

    expect(await screen.findByText("아직 확정 전이라 노선이 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("확정됐지만 경로 정보가 아직 없습니다")).not.toBeInTheDocument();
  });

  // R20-C 목표 1 — 버스를 골라도 지도만 움직이고 카드는 그대로였다(사용자 지적).
  it("현재 화면에 뜬 회차의 카드에 aria-pressed=true 가 붙는다", async () => {
    mockRunIdParam = "9";
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [] });
    render(<TodayRunPage />);

    const active = await screen.findByRole("button", { name: /4호차/ });
    const other = await screen.findByRole("button", { name: /5호차/ });
    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(other).toHaveAttribute("aria-pressed", "false");
  });

  // R20-C 목표 2 — 확정·대기 태그가 같은 색이었다(사용자 지적). 상태-색 매핑이
  // 고정(C-09)이라 class 로 구분을 확인한다(Emotion 은 $status 가 다르면 다른 클래스).
  it("확정과 대기는 서로 다른 태그 색(class)을 쓴다", async () => {
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    render(<TodayRunPage />);

    // 명단 패널의 "대기"(RosterStatus waiting)과 겹치지 않도록 목록 카드(버튼)로 좁힌다.
    const idleCard = await screen.findByRole("button", { name: /2호차/ });
    const confirmedCard = await screen.findByRole("button", { name: /3호차/ });
    const idlePill = within(idleCard).getByText("대기");
    const confirmedPill = within(confirmedCard).getByText("확정");
    expect(idlePill.className).not.toBe(confirmedPill.className);
  });
});
