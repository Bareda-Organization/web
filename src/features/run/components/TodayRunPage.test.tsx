import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { SELECTED_BUS_MAP_ZOOM } from "@/features/map";
import type { MapSurfaceProps } from "@/features/map";
import { TodayRunPage } from "./TodayRunPage";
import { deleteTransfer, getDashboard, getRunRoster, getRunsLive } from "../api";
import { getRunRoute } from "@/features/route";
import type { DashboardResponseTypes, RosterItemResponseTypes, RunsLiveResponseTypes } from "../types";

// §5.4 는 runId 쿼리가 없으면 첫 회차로 리다이렉트해 명단을 불러오는 것이 진입점의
// 핵심 동작이다. absent 는 매니저 앱과 반대로 계속 결측(missed) 로 보여야 한다는
// 화면 전용 규칙(TodayRunPage.tsx 주석)도 함께 검증한다.
const mockReplace = vi.fn();
// 실제 useRouter 는 렌더가 바뀌어도 같은 객체를 돌려준다. 렌더마다 새 객체를 주면 `router` 를 의존성에 둔 effect 가
// 렌더 때마다 다시 예약돼, 주소를 바꾸는 시험이 "아직 실행되지 않은 옛 effect" 와 경합한다(간헐 실패의 원인).
const mockRouter = { replace: mockReplace, push: vi.fn() };
let mockRunIdParam: string | null = null;
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({ get: () => mockRunIdParam }),
}));

vi.mock("../api", () => ({
  getDashboard: vi.fn(),
  getRunRoster: vi.fn(),
  getRunsLive: vi.fn(),
  postForcedAdd: vi.fn(),
  postTransfer: vi.fn(),
  deleteTransfer: vi.fn(),
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
const mockMapSurface = vi.fn<(props: MapSurfaceProps) => null>(() => null);
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
const mockDeleteTransfer = vi.mocked(deleteTransfer);

// R15-T2 이전 시험은 getRunRoute 를 모른다 — 기본값을 비워 두어 기존 시험이
// "노선을 불러오지 못했습니다" 오류로 오염되지 않게 한다.
beforeEach(() => {
  mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], confirmed: true });
});

const baseDashboard: DashboardResponseTypes = {
  metrics: { movingBuses: 1, boarded: 1, noShow: 0, absent: 0, unassignedManagers: 0 },
  runs: [
    {
      runId: "7",
      busNo: "2호차",
      direction: "to_academy",
      departTime: "08:10",
      startedAt: "08:12:30",
      finishedAt: null,
      estArrivalTime: "08:35:00",
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
    studentId: "1",
    name: "김학생",
    className: "1반",
    stopName: "정문",
    transferId: null,
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
    expect(mockGetRunRoster).toHaveBeenCalledWith("7");
  });

  // `FEATURE_SPEC C-02` — `absent`(미등원)와 `no_show`(미승차)는 **반드시 구분**한다.
  // ⚠ 2026-09-21 에 앱 2종과 웹 2곳을 고치면서 이 화면만 "결석"·"미탑승" 으로 남아 있었다.
  it("미등원 학생은 사양 용어(미등원)로 표시된다 — 결석이 아니다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    render(<TodayRunPage />);

    expect(await screen.findByText("미등원")).toBeInTheDocument();
    expect(screen.queryByText("결석")).not.toBeInTheDocument();
  });

  // R34-W2 — 오늘 회차가 하나도 없으면 명단을 부를 일이 없다. 불러오는 중 표시가 그대로 남으면 안 된다.
  it("오늘 회차가 없으면 불러오는 중 문구가 남지 않고 빈 목록 문구로 바뀐다", async () => {
    mockGetDashboard.mockResolvedValue({ ...baseDashboard, runs: [] });
    render(<TodayRunPage />);

    expect(await screen.findByText("표시할 내용이 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("불러오는 중입니다")).not.toBeInTheDocument();
    expect(mockGetRunRoster).not.toHaveBeenCalled();
  });

  // R34-W1 — A-07 수동 조정은 확정 전(①구간, idle) 회차에서만 진입한다(UF-M-04).
  describe("다른 버스로 이동(A-07)", () => {
    const idleRun = (runId: string, busNo: string, direction: "to_academy" | "from_academy", runStatus: "idle" | "confirmed" | "moving") => ({
      ...baseDashboard.runs[0],
      runId,
      busNo,
      direction,
      runStatus,
    });
    const dashboardOf = (runs: ReturnType<typeof idleRun>[]) => ({ ...baseDashboard, runs });

    it("확정 전 회차의 학생 행에는 [다른 버스로] 버튼이 있고 눌러 도착 회차 후보는 같은 방향·확정 전 다른 버스만 나온다", async () => {
      mockRunIdParam = "7";
      mockGetDashboard.mockResolvedValue(
        dashboardOf([
          idleRun("7", "2호차", "to_academy", "idle"),
          idleRun("8", "3호차", "to_academy", "idle"),
          idleRun("9", "4호차", "to_academy", "confirmed"),
          idleRun("10", "5호차", "from_academy", "idle"),
        ]),
      );
      mockGetRunRoster.mockResolvedValue(baseRoster);
      render(<TodayRunPage />);

      fireEvent.click(await screen.findByRole("button", { name: "다른 버스로" }));

      const select = screen.getByLabelText("도착 회차");
      const options = within(select).getAllByRole("option").map((option) => option.textContent);
      expect(options.filter((text) => text?.includes("호차"))).toEqual(["3호차 · 08:10 출발"]);
    });

    it("확정된 회차에는 [다른 버스로] 버튼이 없다", async () => {
      mockRunIdParam = "7";
      mockGetDashboard.mockResolvedValue(
        dashboardOf([idleRun("7", "2호차", "to_academy", "confirmed"), idleRun("8", "3호차", "to_academy", "idle")]),
      );
      mockGetRunRoster.mockResolvedValue(baseRoster);
      render(<TodayRunPage />);

      await screen.findByText("김학생");
      expect(screen.queryByRole("button", { name: "다른 버스로" })).not.toBeInTheDocument();
    });

    // F01-07 — 강제 추가는 ①구간(확정 전) 전용이다(§5.7). 확정된 회차에서 끝까지 입력하고서야 403 을 받게 하지 않는다.
    it("확정된 회차에서는 [강제 승하차지 추가] 를 누를 수 없고, 확정 전 회차에서는 누를 수 있다", async () => {
      mockRunIdParam = "7";
      mockGetDashboard.mockResolvedValue(dashboardOf([idleRun("7", "2호차", "to_academy", "confirmed")]));
      mockGetRunRoster.mockResolvedValue(baseRoster);
      const { unmount } = render(<TodayRunPage />);
      await screen.findByText("김학생");
      expect(screen.getByRole("button", { name: "강제 승하차지 추가" })).toBeDisabled();
      // B1 #25 — 사유가 툴팁뿐이면 키보드·터치로 못 읽는다. 글자로도 보인다.
      expect(screen.getByText("확정된 회차에는 추가할 수 없습니다 (출발 30분 전까지만)")).toBeInTheDocument();
      unmount();

      mockGetDashboard.mockResolvedValue(dashboardOf([idleRun("7", "2호차", "to_academy", "idle")]));
      render(<TodayRunPage />);
      await screen.findByText("김학생");
      expect(screen.getByRole("button", { name: "강제 승하차지 추가" })).toBeEnabled();
      expect(screen.queryByText("확정된 회차에는 추가할 수 없습니다 (출발 30분 전까지만)")).not.toBeInTheDocument();
    });

    it("이미 제외로 표시된 학생 행에는 버튼이 없다", async () => {
      mockRunIdParam = "7";
      mockGetDashboard.mockResolvedValue(dashboardOf([idleRun("7", "2호차", "to_academy", "idle")]));
      mockGetRunRoster.mockResolvedValue([{ ...baseRoster[0], change: "removed" }]);
      render(<TodayRunPage />);

      await screen.findByText("김학생");
      expect(screen.queryByRole("button", { name: "다른 버스로" })).not.toBeInTheDocument();
    });

    // R36-FE FE1 — 이동 대기(§5.8 staged)로 들어온 행에만 [이동 취소](§5.8.1, Ruling 369).
    describe("이동 취소(§5.8.1)", () => {
      const idleDashboard = () => dashboardOf([idleRun("7", "2호차", "to_academy", "idle")]);
      const stagedRow: RosterItemResponseTypes = {
        ...baseRoster[0],
        studentId: "2",
        name: "이대기",
        change: "added",
        transferId: "31",
      };

      it("transferId 가 있는 행에만 [이동 취소] 가 있고, 그 행에는 [다른 버스로] 를 두지 않는다", async () => {
        mockRunIdParam = "7";
        mockGetDashboard.mockResolvedValue(idleDashboard());
        mockGetRunRoster.mockResolvedValue([baseRoster[0], stagedRow]);
        render(<TodayRunPage />);

        await screen.findByText("이대기");
        expect(screen.getAllByRole("button", { name: "이동 취소" })).toHaveLength(1);
        expect(screen.getAllByRole("button", { name: "다른 버스로" })).toHaveLength(1);
      });

      it("확인 단계에서 돌아가면 요청을 보내지 않는다", async () => {
        mockRunIdParam = "7";
        mockGetDashboard.mockResolvedValue(idleDashboard());
        mockGetRunRoster.mockResolvedValue([stagedRow]);
        render(<TodayRunPage />);

        fireEvent.click(await screen.findByRole("button", { name: "이동 취소" }));
        expect(screen.getByText(/이대기 학생/, { selector: "p" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "돌아가기" }));

        expect(mockDeleteTransfer).not.toHaveBeenCalled();
        expect(screen.queryByRole("button", { name: "이동 취소하기" })).not.toBeInTheDocument();
      });

      // C00-05 — 취소하면 학생은 출발 회차 예정 명단에서 빠져 있던 것이 되돌아온다. "그대로 남는다" 는
      // 옮겨진 적이 없는 것처럼 읽혀 결과를 흐린다.
      // R37-IT — [이동 취소] 는 도착 회차 명단의 행에 붙는다. 그 화면의 호차(2호차)는 도착 버스이고
      // 학생이 돌아갈 출발 버스가 아니다 — 명단 응답에는 출발 호차가 없으니 호차를 적지 않는다.
      it("확인 문구가 학생이 원래 버스 명단으로 돌아간다고 말하되 지금 화면의 호차를 원래 버스로 적지 않는다", async () => {
        mockRunIdParam = "7";
        mockGetDashboard.mockResolvedValue(idleDashboard());
        mockGetRunRoster.mockResolvedValue([stagedRow]);
        render(<TodayRunPage />);

        fireEvent.click(await screen.findByRole("button", { name: "이동 취소" }));

        expect(screen.getByText(/원래 버스 명단으로 돌아갑니다/)).toBeInTheDocument();
        expect(screen.queryByText(/원래 버스\(/)).not.toBeInTheDocument();
        expect(screen.queryByText(/그대로 남습니다/)).not.toBeInTheDocument();
      });

      it("확인하면 DELETE 를 정확히 1회 보내고 성공하면 명단을 다시 불러온다", async () => {
        mockRunIdParam = "7";
        mockGetDashboard.mockResolvedValue(idleDashboard());
        mockGetRunRoster.mockResolvedValue([stagedRow]);
        mockDeleteTransfer.mockResolvedValue(undefined);
        render(<TodayRunPage />);

        fireEvent.click(await screen.findByRole("button", { name: "이동 취소" }));
        const rosterCallsBefore = mockGetRunRoster.mock.calls.length;
        fireEvent.click(screen.getByRole("button", { name: "이동 취소하기" }));

        await waitFor(() => expect(mockGetRunRoster.mock.calls.length).toBeGreaterThan(rosterCallsBefore));
        expect(mockDeleteTransfer).toHaveBeenCalledTimes(1);
        expect(mockDeleteTransfer).toHaveBeenCalledWith("31");
        await waitFor(() => expect(screen.queryByRole("button", { name: "이동 취소하기" })).not.toBeInTheDocument());
      });

      it.each([
        ["CHANGE_WINDOW_CLOSED", 403, "이미 확정된 회차가 있어 이동을 취소할 수 없습니다"],
        ["TRANSFER_NOT_FOUND", 404, "이미 취소되었거나 찾을 수 없는 이동 기록입니다"],
      ])("%s 는 쉬운 한국어 문구를 보여주고 대화상자를 유지한다", async (code, status, message) => {
        mockRunIdParam = "7";
        mockGetDashboard.mockResolvedValue(idleDashboard());
        mockGetRunRoster.mockResolvedValue([stagedRow]);
        mockDeleteTransfer.mockRejectedValue(new ApiError(status, code as never, "서버 원문"));
        render(<TodayRunPage />);

        fireEvent.click(await screen.findByRole("button", { name: "이동 취소" }));
        fireEvent.click(screen.getByRole("button", { name: "이동 취소하기" }));

        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(screen.queryByText("서버 원문")).not.toBeInTheDocument();
      });
    });
  });

  // R36-FE FE5 — 예정 명단에서 승하차지가 정해지지 않은 학생은 `stop_name` 이 null 로 온다.
  it("stopName 이 null 인 행은 승하차지 미지정으로 보이고 화면이 죽지 않는다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue([{ ...baseRoster[0], stopName: null }]);
    render(<TodayRunPage />);

    expect(await screen.findByText("김학생")).toBeInTheDocument();
    // 묶음 머리줄 1곳 + 행 칸 1곳.
    expect(screen.getAllByText("승하차지 미지정")).toHaveLength(2);
  });

  it("명단 조회에 실패하면 오류 배너를 보여준다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockRejectedValue(new ApiError(500, "INTERNAL", "명단 서버 오류"));
    render(<TodayRunPage />);

    await waitFor(() => expect(screen.getByText("명단 서버 오류")).toBeInTheDocument());
  });

  // R21-B 목표 2·3·4 — DashboardPage.test.tsx 와 같은 이유로 `container.textContent`
  // 포함 여부로 본다(판단 근거, 보고서 §1). 명단 표 행마다 같은 회차 값이 반복되므로 한
  // 번만 나오는지까지는 보지 않고 "떴는가"만 본다.
  it("명단 표와 사이드 카드 모두 출발·도착 시각을 예정·실제로 구별해 보여준다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    const { container } = render(<TodayRunPage />);

    await screen.findByText("김학생");
    expect(container.textContent).toContain("예정 08:10");
    expect(container.textContent).toContain("실제 08:12:30");
  });

  it("아직 종료 전이면 도착 칸이 빈 값(-)으로 남는다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard); // finishedAt: null
    mockGetRunRoster.mockResolvedValue(baseRoster);
    render(<TodayRunPage />);

    await screen.findByText("김학생");
    // 도착 컬럼 헤더 옆 "-" 는 다른 컬럼(변경 등)도 같은 문구를 쓰므로 헤더 존재만 본다 —
    // 값 자체는 위 통합 검사가 이미 실제 finishedAt=null 경로를 지나며 함께 검증한다.
    expect(screen.getByText("도착")).toBeInTheDocument();
  });

  // R21-B2 목표 1·2 — DashboardPage.test.tsx 와 같은 이유로 est_arrival_time 이 "예정"
  // 도착으로 뜨는지 본다.
  it("도착 컬럼이 est_arrival_time 을 예정 도착으로 보여준다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    const { container } = render(<TodayRunPage />);

    await screen.findByText("김학생");
    expect(container.textContent).toContain("예정 08:35:00");
  });

  // 사용자 지시(2026-09-22) — "현재 위치" 카드 하단에 도착 예정 시각도 보이게.
  // 출발 시각 바로 아래에 같은 형식으로 둔다.
  it("현재 위치 카드가 출발 시각과 함께 도착 예정 시각을 보여준다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    render(<TodayRunPage />);

    await screen.findByText("김학생");
    const label = screen.getByText("도착 예정");
    expect(label.parentElement?.textContent).toContain("08:35:00");
  });
});

// 사용자 지시(2026-09-22) — 명단을 승하차지별로 묶어 접고 펼 수 있게. 한 회차에
// 승하차지가 10곳이면 학생 행이 그만큼 이어져 어느 자리 학생인지 눈으로 좇기 어렵다.
describe("TodayRunPage — 명단을 승하차지별로 묶는다", () => {
  const twoStopRoster: RosterItemResponseTypes[] = [
    { studentId: "1", name: "김학생", className: "1반", stopName: "정문", transferId: null, guardianPhone: "", change: null, status: "waiting", note: null },
    { studentId: "2", name: "이학생", className: "1반", stopName: "정문", transferId: null, guardianPhone: "", change: null, status: "waiting", note: null },
    { studentId: "3", name: "박학생", className: "2반", stopName: "후문", transferId: null, guardianPhone: "", change: null, status: "waiting", note: null },
  ];

  afterEach(() => {
    mockRunIdParam = null;
    vi.clearAllMocks();
  });

  it("승하차지 이름과 그 자리 인원을 묶음 머리줄로 보여준다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(twoStopRoster);
    render(<TodayRunPage />);

    const first = await screen.findByRole("button", { name: /정문/ });
    expect(first.textContent).toContain("2명");
    expect(screen.getByRole("button", { name: /후문/ }).textContent).toContain("1명");
  });

  it("묶음 머리줄을 누르면 그 승하차지 학생만 접힌다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(twoStopRoster);
    render(<TodayRunPage />);

    const first = await screen.findByRole("button", { name: /정문/ });
    expect(first).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(first);

    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("김학생")).not.toBeInTheDocument();
    expect(screen.queryByText("이학생")).not.toBeInTheDocument();
    // 다른 묶음은 그대로 펼쳐져 있다.
    expect(screen.getByText("박학생")).toBeInTheDocument();
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
          runId: "7",
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
          // R21-A 목표 1~3 — 이 화면은 항상 회차 하나가 선택돼 있어 selected 는 항상 true.
          markers: [
            { id: "7", lat: 37.55, lng: 127.01, kind: "bus", selected: true, busNo: "2호차", direction: "to_academy" },
          ],
          // R18-B2 목표 2 — 세 화면이 같은 확대 수준(16)을 쓴다. 이 화면은 항상 회차
          // 하나가 선택돼 있어(토글 없음) 마커가 있으면 곧 "선택된 버스" 다.
          camera: { lat: 37.55, lng: 127.01, zoom: SELECTED_BUS_MAP_ZOOM },
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
          runId: "7",
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

// R15-T2 docs/archive/rounds/be-rounds-r15-r21.md §8.23 목표 3·4·5 — 우측 버스 목록은 4종 상태 전부를 보이고, 선택된
// 회차의 §5.19 노선을 지도에 그린다.
describe("TodayRunPage — 버스 목록 4종 상태·노선 표시(R15-T2)", () => {
  const fourStatusDashboard: DashboardResponseTypes = {
    metrics: baseDashboard.metrics,
    runs: [
      { ...baseDashboard.runs[0], runId: "7", busNo: "2호차", runStatus: "idle" },
      { ...baseDashboard.runs[0], runId: "8", busNo: "3호차", runStatus: "confirmed" },
      { ...baseDashboard.runs[0], runId: "9", busNo: "4호차", runStatus: "moving" },
      { ...baseDashboard.runs[0], runId: "10", busNo: "5호차", runStatus: "finished" },
    ],
  };

  afterEach(() => {
    mockRunIdParam = null;
    vi.clearAllMocks();
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], confirmed: true });
  });

  // B1 #3 — 같은 이름 회차를 구분하도록 버스 목록 항목 앞에 출발 시각을 붙인다.
  it("idle·confirmed·moving·finished 4종 상태가 전부 목록에 남는다 — finished 도 걸러내지 않는다", async () => {
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    render(<TodayRunPage />);

    expect(await screen.findByText("08:10 2호차 · 등원")).toBeInTheDocument();
    expect(screen.getByText("08:10 3호차 · 등원")).toBeInTheDocument();
    expect(screen.getByText("08:10 4호차 · 등원")).toBeInTheDocument();
    expect(screen.getByText("08:10 5호차 · 등원")).toBeInTheDocument();
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

    fireEvent.click(await screen.findByText("08:10 5호차 · 등원"));

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
      confirmed: true,
    });
    render(<TodayRunPage />);

    // runId 9(4호차)는 runStatus:"moving" — R20-C 목표 3, kind 가 상태를 따라간다.
    // `selectedRun` 이 runs 로딩 전엔 null 이라 loadRoute 이펙트가 두 번 걸린다
    // (idle 기본값 → 실제 상태) — waitFor 로 최종 렌더를 기다린다.
    expect(await screen.findByText("근사 경로")).toBeInTheDocument();
    expect(mockGetRunRoute).toHaveBeenCalledWith("9");
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
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], confirmed: true });
    render(<TodayRunPage />);

    expect(await screen.findByText("확정됐지만 경로 정보가 아직 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("근사 경로")).not.toBeInTheDocument();
  });

  // Ruling 321 — runId 7(2호차, idle)인데 백엔드가 confirmed:false·좌표 0개(고정
  // 노선 자체가 없음)를 돌려주면 "확정됐지만 없음"과 다른 문구를 보여준다.
  it("고정 노선이 없는 idle 회차(runId 7)를 고르면 고정 노선이 없다는 안내(편성 화면 링크 포함)를 보여준다", async () => {
    mockRunIdParam = "7";
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], confirmed: false });
    render(<TodayRunPage />);

    expect(await screen.findByText(/이 회차의 고정 노선이 없습니다/)).toBeInTheDocument();
    expect(screen.queryByText("확정됐지만 경로 정보가 아직 없습니다")).not.toBeInTheDocument();
  });

  // Ruling 321 — idle 회차가 고정 노선 기반 "예정" 경로를 받으면 지도 위에서 알린다.
  it("idle 회차(runId 7)가 예정 경로를 받으면 예정 경로 안내를 지도 위에 보여준다", async () => {
    mockRunIdParam = "7";
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    mockGetRunRoute.mockResolvedValue({
      roadPath: [{ lat: 37.1, lng: 127.1 }],
      fallbackUsed: false,
      stops: [],
      confirmed: false,
    });
    render(<TodayRunPage />);

    expect(await screen.findByText(/예정 경로 — 확정 시 달라질 수 있음/)).toBeInTheDocument();
  });

  // R20-C 목표 1 — 버스를 골라도 지도만 움직이고 카드는 그대로였다(사용자 지적).
  it("현재 화면에 뜬 회차의 카드에 aria-pressed=true 가 붙는다", async () => {
    mockRunIdParam = "9";
    mockGetDashboard.mockResolvedValue(fourStatusDashboard);
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], confirmed: true });
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

// R24 — 지도에서 승하차지를 누르면 그 자리에서 타고 내리는 학생만 "현재 위치" 아래에
// 나온다(사용자 지시). 명단은 승하차지를 이름 문자열로만 싣기 때문에, 지도 마커 id
// (`stop-{stopId}`) → 노선 응답의 정차지 이름 → 명단의 `stopName` 순으로 이어야 한다.
describe("TodayRunPage — 지도에서 고른 승하차지의 학생만 보기(R24)", () => {
  const 두정차지_노선 = {
    roadPath: [
      { lat: 37.56, lng: 126.97 },
      { lat: 37.5, lng: 127.02 },
    ],
    fallbackUsed: false,
    stops: [
      { stopId: "11", seq: 1, name: "한빛아파트 정문", lat: 37.56, lng: 126.97 },
      { stopId: "22", seq: 2, name: "그린빌라 입구", lat: 37.55, lng: 126.98 },
    ],
    confirmed: true,
  };
  const 두정차지_명단: RosterItemResponseTypes[] = [
    { studentId: "1", name: "한빛학생", className: "1반", stopName: "한빛아파트 정문", transferId: null,
      guardianPhone: "010-1111-1111", change: null, status: "waiting", note: null },
    { studentId: "2", name: "그린학생", className: "2반", stopName: "그린빌라 입구", transferId: null,
      guardianPhone: "010-2222-2222", change: null, status: "waiting", note: null },
    { studentId: "3", name: "한빛둘째", className: "3반", stopName: "한빛아파트 정문", transferId: null,
      guardianPhone: "010-3333-3333", change: null, status: "boarded", note: null },
  ];

  const 승하차지_누르기 = (markerId: string) => {
    const onMarkerClick = mockMapSurface.mock.calls.at(-1)?.[0].onMarkerClick;
    expect(onMarkerClick).toBeTypeOf("function");
    onMarkerClick!(markerId);
  };

  // ⚠ 승하차지 이름은 **본 명단 표에도** 같은 글자로 있다(`stopName` 열). 글자만으로 찾으면
  // 표의 칸이 함께 잡혀 "옆 패널에 떴는가" 를 판정하지 못한다 — 카드 제목(`<p>`)만 집는다.
  const 옆패널_카드 = (stopName: string): HTMLElement | null => {
    const heading = screen.queryAllByText(stopName).find((element) => element.tagName === "P");
    return heading ? (heading.parentElement!.parentElement as HTMLElement) : null;
  };

  afterEach(() => {
    mockRunIdParam = null;
    vi.clearAllMocks();
  });

  it("승하차지를 누르면 그 자리 학생만 나오고 다른 자리 학생은 빠진다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(두정차지_명단);
    mockGetRunRoute.mockResolvedValue(두정차지_노선);
    render(<TodayRunPage />);
    await screen.findByText("한빛학생");

    승하차지_누르기("stop-11");

    // 옆 패널에 그 승하차지 이름이 제목으로 서고, 그 자리 학생 2명만 실린다.
    await waitFor(() => expect(옆패널_카드("한빛아파트 정문")).not.toBeNull());
    const card = 옆패널_카드("한빛아파트 정문")!;
    expect(within(card).getByText("한빛학생")).toBeInTheDocument();
    expect(within(card).getByText("한빛둘째")).toBeInTheDocument();
    expect(within(card).queryByText("그린학생")).not.toBeInTheDocument();
  });

  it("같은 승하차지를 다시 누르면 목록이 닫힌다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(두정차지_명단);
    mockGetRunRoute.mockResolvedValue(두정차지_노선);
    render(<TodayRunPage />);
    await screen.findByText("한빛학생");

    승하차지_누르기("stop-22");
    await waitFor(() => expect(옆패널_카드("그린빌라 입구")).not.toBeNull());

    승하차지_누르기("stop-22");

    await waitFor(() => expect(옆패널_카드("그린빌라 입구")).toBeNull());
  });

  it("버스 마커를 누르면 승하차지 선택이 풀린다 — 승하차지 마커만 목록을 연다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(두정차지_명단);
    mockGetRunRoute.mockResolvedValue(두정차지_노선);
    render(<TodayRunPage />);
    await screen.findByText("한빛학생");

    승하차지_누르기("stop-11");
    await waitFor(() => expect(옆패널_카드("한빛아파트 정문")).not.toBeNull());

    승하차지_누르기("7"); // 버스 마커 id = 회차 id

    await waitFor(() => expect(옆패널_카드("한빛아파트 정문")).toBeNull());
  });

  it("고른 승하차지 마커에만 선택 표시가 붙는다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunRoster.mockResolvedValue(두정차지_명단);
    mockGetRunRoute.mockResolvedValue(두정차지_노선);
    render(<TodayRunPage />);
    await screen.findByText("한빛학생");

    승하차지_누르기("stop-22");

    await waitFor(() => {
      const markers = mockMapSurface.mock.calls.at(-1)![0].markers;
      expect(markers.find((marker) => marker.id === "stop-22")?.selected).toBe(true);
      expect(markers.find((marker) => marker.id === "stop-11")?.selected).toBeUndefined();
    });
  });
});

// C00-01·F01-03·F01-04·F01-05·C00-03·F01-14 — 선택 회차 유지 · 자동 갱신 · 요청 경합 · 노선 없음 안내.
describe("TodayRunPage — 선택 유지·갱신·경합(2026-09-30 검사)", () => {
  const runOf = (runId: string, runStatus: "idle" | "confirmed" | "moving" | "finished") => ({
    ...baseDashboard.runs[0],
    runId,
    busNo: `${runId}호차`,
    runStatus,
  });
  const dashboardOf = (...runs: ReturnType<typeof runOf>[]): DashboardResponseTypes => ({ ...baseDashboard, runs });

  afterEach(() => {
    mockRunIdParam = null;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // C00-01 — 사이드바로 들어오면 첫 렌더의 runIdParam 이 null 이라 loadRuns 가 옛 null 을 붙들고 있었다.
  it("주소에 회차가 정해진 뒤 명단을 다시 불러와도 첫 회차로 주소를 되돌리지 않는다", async () => {
    const staged: RosterItemResponseTypes = { ...baseRoster[0], name: "이대기", change: "added", transferId: "31" };
    mockGetDashboard.mockResolvedValue(dashboardOf(runOf("7", "idle"), runOf("8", "idle")));
    mockGetRunRoster.mockResolvedValue([staged]);
    mockDeleteTransfer.mockResolvedValue(undefined);
    const { rerender } = render(<TodayRunPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/today-run?runId=7"));

    mockRunIdParam = "8"; // 관계자가 8호차를 골라 주소가 바뀐 상태
    mockReplace.mockClear();
    rerender(<TodayRunPage />);
    fireEvent.click(await screen.findByRole("button", { name: "이동 취소" }));
    const dashboardCallsBefore = mockGetDashboard.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "이동 취소하기" }));

    await waitFor(() => expect(mockGetDashboard.mock.calls.length).toBeGreaterThan(dashboardCallsBefore));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  // F01-04 — 직접 진입하면 회차 목록이 오기 전에 상태 없이 노선을 그리는 호출이 먼저 나가고, 목록이 오면 다시 나갔다.
  it("회차 목록이 오기 전에는 명단·노선을 부르지 않고, 목록이 오면 각 한 번씩만 부른다", async () => {
    mockRunIdParam = "7";
    let resolveDashboard: (value: DashboardResponseTypes) => void = () => {};
    mockGetDashboard.mockReturnValue(new Promise((resolve) => (resolveDashboard = resolve)));
    mockGetRunRoster.mockResolvedValue(baseRoster);
    render(<TodayRunPage />);
    await waitFor(() => expect(mockGetRunRoster).toHaveBeenCalledTimes(1));
    expect(mockGetRunRoute).not.toHaveBeenCalled();

    resolveDashboard(dashboardOf(runOf("7", "moving")));

    await waitFor(() => expect(mockGetRunRoute).toHaveBeenCalledTimes(1));
    expect(mockGetRunRoster).toHaveBeenCalledTimes(1);
  });

  // F01-03 — 명단·현재 위치·버스 마커는 진입 시점 값에서 갱신이 없었다.
  it("진행 중인 회차는 7초마다 명단·위치·회차 상태를 다시 불러와 탑승 현황이 바뀐다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockRunIdParam = "7";
    mockGetDashboard.mockResolvedValue(dashboardOf(runOf("7", "moving")));
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    mockGetRunRoster.mockResolvedValueOnce([{ ...baseRoster[0], status: "waiting" }]);
    render(<TodayRunPage />);
    expect(await screen.findByText("대기")).toBeInTheDocument();

    mockGetRunRoster.mockResolvedValue([{ ...baseRoster[0], status: "boarded" }]);
    await vi.advanceTimersByTimeAsync(7000);

    expect(await screen.findByText("탑승 완료")).toBeInTheDocument();
    expect(mockGetRunsLive.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockGetDashboard.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("종료된 회차는 다시 불러오지 않는다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockRunIdParam = "7";
    mockGetDashboard.mockResolvedValue(dashboardOf(runOf("7", "finished")));
    mockGetRunRoster.mockResolvedValue(baseRoster);
    render(<TodayRunPage />);
    await screen.findByText("김학생");

    await vi.advanceTimersByTimeAsync(15000);

    expect(mockGetRunRoster).toHaveBeenCalledTimes(1);
  });

  // F01-05 — 회차를 연달아 바꾸면 이전 회차의 명단이 늦게 와서 새 회차 제목 아래에 남았다.
  it("회차를 바꾸기 전에 보낸 명단 요청의 늦은 응답이 새 회차의 명단을 덮지 않는다", async () => {
    mockRunIdParam = "7";
    let resolveOld: (value: RosterItemResponseTypes[]) => void = () => {};
    mockGetDashboard.mockResolvedValue(dashboardOf(runOf("7", "idle"), runOf("8", "idle")));
    mockGetRunRoster.mockImplementation((runId) =>
      runId === "7"
        ? new Promise((resolve) => (resolveOld = resolve))
        : Promise.resolve([{ ...baseRoster[0], studentId: "2", name: "8호차학생" }]),
    );
    const { rerender } = render(<TodayRunPage />);
    await waitFor(() => expect(mockGetRunRoster).toHaveBeenCalledWith("7"));

    mockRunIdParam = "8";
    rerender(<TodayRunPage />);
    await screen.findByText("8호차학생");
    resolveOld([{ ...baseRoster[0], name: "7호차학생" }]);

    await waitFor(() => expect(screen.queryByText("7호차학생")).not.toBeInTheDocument());
    expect(screen.getByText("8호차학생")).toBeInTheDocument();
  });

  // C00-03 — 고정 노선이 없는 확정 전 회차는 §5.19 가 409 RUN_NOT_CONFIRMED 를 준다. 그 원문("확정되지 않은
  // 회차입니다")을 오류 띠로 내면 "확정을 기다리면 된다" 로 읽힌다 — 실제 원인은 고정 노선 부재다.
  it("고정 노선이 없어 노선 조회가 RUN_NOT_CONFIRMED 면 오류 띠 대신 고정 노선 편성 안내를 보여준다", async () => {
    mockRunIdParam = "7";
    mockGetDashboard.mockResolvedValue(dashboardOf(runOf("7", "idle")));
    mockGetRunRoster.mockResolvedValue(baseRoster);
    mockGetRunRoute.mockRejectedValue(new ApiError(409, "RUN_NOT_CONFIRMED", "확정되지 않은 회차입니다"));
    render(<TodayRunPage />);

    expect(await screen.findByText(/이 회차의 고정 노선이 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "고정 노선 편성에서 등록하세요" })).toHaveAttribute("href", "/route");
    expect(screen.queryByText("확정되지 않은 회차입니다")).not.toBeInTheDocument();
  });

  // F01-14 — 보호자 미연결 학생은 연락처가 null(§5.4)이다. 다른 null 열(반)처럼 "-" 로 보여 실패로 읽히지 않게 한다.
  it("보호자 연락처가 없는 학생은 빈 칸이 아니라 - 로 보인다", async () => {
    mockRunIdParam = "7";
    mockGetDashboard.mockResolvedValue(dashboardOf(runOf("7", "idle")));
    mockGetRunRoster.mockResolvedValue([{ ...baseRoster[0], guardianPhone: null }]);
    render(<TodayRunPage />);

    const row = (await screen.findByText("김학생")).closest("tr")!;
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    const phoneCell = within(row).getAllByRole("cell")[headers.indexOf("보호자 연락처")];
    expect(phoneCell).toHaveTextContent("-");
  });
});
