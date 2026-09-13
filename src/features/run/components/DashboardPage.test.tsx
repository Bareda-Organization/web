import { render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import type { WebSocketEnvelope, WsConnectionState } from "@/shared/lib/ws";
import { DashboardPage } from "./DashboardPage";
import { getDashboard, getRunsLive } from "../api";
import type { DashboardResponseTypes, RunLiveItemResponseTypes, RunsLiveResponseTypes } from "../types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// AuthGateGuard 가 관계자 role 에서만 이 화면을 그리므로(DashboardPage.tsx 의 Goal 7
// 주석 참고) 실제로는 `session.academy` 가 항상 값을 갖는다 — 이 화면 단독 시험은
// 그 전제를 흉내 낸 고정 세션을 준다. 로그인·부트스트랩까지 함께 시험할 필요가
// 없어(이 화면만 대상) `AuthSessionProvider` 를 실제로 씌우지 않는다.
const mockUseAuthSession = vi.fn();
vi.mock("@/features/auth", () => ({
  useAuthSession: () => mockUseAuthSession(),
}));

// Goal 7·9 시험은 실제 WebSocket 을 열지 않는다 — `useRealtimeChannel` 자체를
// 가짜로 바꿔 봉투 전달(`onEnvelope`)과 연결 상태(`connectionState`)를 시험이
// 직접 제어한다. 그 훅 내부(참조 계수·재구독)는 `useRealtimeChannel.test.ts` 가
// 이미 따로 검증하므로 여기서 다시 열지 않는다.
let capturedOnEnvelope: ((envelope: WebSocketEnvelope) => void) | undefined;
let mockConnectionState: WsConnectionState = "connected";
const mockUseRealtimeChannel = vi.fn((_destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void) => {
  capturedOnEnvelope = onEnvelope;
  return { connectionState: mockConnectionState };
});
vi.mock("@/shared/hooks", () => ({
  useRealtimeChannel: (destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void) =>
    mockUseRealtimeChannel(destination, onEnvelope),
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

const baseLiveRun: RunLiveItemResponseTypes = {
  runId: 1,
  busNo: "1호차",
  direction: "to_academy",
  status: "moving",
  position: null,
  currentStop: "정문",
  nextStop: "후문",
  progress: { done: 1, total: 5 },
  delayMinutes: null,
  driverName: "김기사",
  escortName: null,
  lastSeenAt: null,
};

const envelope = (
  event: WebSocketEnvelope["event"],
  payload: Record<string, unknown>,
  runId = "1",
): WebSocketEnvelope => ({
  event,
  eventWireValue: event ?? undefined,
  runId,
  occurredAt: "2026-09-13T00:00:00Z",
  payload,
});

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
  beforeEach(() => {
    mockUseAuthSession.mockReturnValue({
      session: { accountId: "1", role: "staff", status: "active", academy: { id: "1", name: "테스트 학원" } },
    });
    mockConnectionState = "connected";
    capturedOnEnvelope = undefined;
  });

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

// Goal 7 — `/topic/academy/{academyId}/live` 이벤트 배선. `position` 은 payload 를
// 그대로 병합하고, 나머지 회차 상태 변화는 `loadLive()`(getRunsLive) 재조회로
// 반영한다는 판단(보고서 §1)을 고정한다.
describe("DashboardPage — 실시간 이벤트 배선(Goal 7)", () => {
  beforeEach(() => {
    mockUseAuthSession.mockReturnValue({
      session: { accountId: "1", role: "staff", status: "active", academy: { id: "1", name: "테스트 학원" } },
    });
    mockConnectionState = "connected";
    capturedOnEnvelope = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("position 이벤트는 REST 재조회 없이 해당 회차의 좌표·현재 정류장을 직접 갱신한다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
    render(<DashboardPage />);

    // baseLiveRun 은 position 이 null 이라 초기 렌더는 "위치 확인 대기" 다(DashboardPage.tsx
    // 의 `run.position ? ... : ...` 분기) — "1호차" 는 대시보드 표에도 함께 나와 유일하지 않다.
    await screen.findByText("위치 확인 대기");
    const callsBeforeEvent = mockGetRunsLive.mock.calls.length;

    act(() => {
      capturedOnEnvelope?.(
        envelope("position", {
          lat: 37.5,
          lng: 127.0,
          received_at: "2026-09-13T00:00:01Z",
          current_stop_name: "3번 정류장",
          eta: null,
        }),
      );
    });

    expect(await screen.findByText("현재 3번 정류장 → 다음 후문")).toBeInTheDocument();
    // payload 병합만으로 반영돼야 한다 — REST 재조회가 새로 일어나지 않았는지 확인.
    expect(mockGetRunsLive.mock.calls.length).toBe(callsBeforeEvent);
  });

  it.each(["stop_arrived", "rider_changed", "run_started", "run_ended"] as const)(
    "%s 이벤트는 payload 를 직접 반영하지 않고 실시간 목록을 재조회한다",
    async (eventType) => {
      mockGetDashboard.mockResolvedValue(baseDashboard);
      mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
      render(<DashboardPage />);
      // "1호차" 는 대시보드 표에도 나와 유일하지 않다 — 실시간 카드에만 있는 문구로 기다린다.
      await screen.findByText("위치 확인 대기");

      const callsBeforeEvent = mockGetRunsLive.mock.calls.length;
      await act(async () => {
        capturedOnEnvelope?.(envelope(eventType, {}));
      });

      await waitFor(() => expect(mockGetRunsLive.mock.calls.length).toBe(callsBeforeEvent + 1));
    },
  );

  it("emergency_raised 이벤트는 비상 배너를 띄운다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue(emptyLive);
    render(<DashboardPage />);
    await screen.findByText("1호차");

    act(() => {
      capturedOnEnvelope?.(
        envelope("emergency_raised", {
          emergency_id: 9,
          type: "accident",
          bus_no: "2호차",
          raised_by: { name: "김기사", role: "driver", phone: "010" },
          position: { lat: 1, lng: 1 },
          rider_count: 3,
          raised_at: "2026-09-13T00:00:00Z",
        }),
      );
    });

    expect(await screen.findByText("비상 상황 발생 — 2호차 호차 (accident)")).toBeInTheDocument();
  });

  it("approval_requested 이벤트는 탑승 승인 요청 배너를 띄운다", async () => {
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue(emptyLive);
    render(<DashboardPage />);
    await screen.findByText("1호차");

    act(() => {
      capturedOnEnvelope?.(
        envelope("approval_requested", {
          approval_id: 5,
          student_name: "박학생",
          run_id: 1,
          stop_name: "정문",
          deadline_at: "2026-09-13T00:10:00Z",
        }),
      );
    });

    expect(await screen.findByText("탑승 승인 요청 — 박학생 (정문)")).toBeInTheDocument();
  });
});

// Goal 9 — "데이터 없음"과 "WebSocket 연결 끊김"을 구분한다. REST 폴링이 채운
// "지금 이동 중인 버스가 없습니다"는 WS 상태와 무관하게 항상 사실이라는 판단
// (보고서 §1)을 고정 — 배너는 목록을 대체하지 않고 위에 별도로 뜬다.
describe("DashboardPage — WS 연결 상태 배너(Goal 9)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("연결이 끊기면(gaveUp) 연결 끊김 배너를 띄우고, 빈 목록 문구도 함께 유지한다", async () => {
    mockUseAuthSession.mockReturnValue({
      session: { accountId: "1", role: "staff", status: "active", academy: { id: "1", name: "테스트 학원" } },
    });
    mockConnectionState = "gaveUp";
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue(emptyLive);
    render(<DashboardPage />);

    expect(await screen.findByText("실시간 연결 끊김")).toBeInTheDocument();
    expect(screen.getByText("지금 이동 중인 버스가 없습니다")).toBeInTheDocument();
  });

  it("forbidden 이면 권한 없음 문구를 띄운다", async () => {
    mockUseAuthSession.mockReturnValue({
      session: { accountId: "1", role: "staff", status: "active", academy: { id: "1", name: "테스트 학원" } },
    });
    mockConnectionState = "forbidden";
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue(emptyLive);
    render(<DashboardPage />);

    expect(await screen.findByText("실시간 조회 권한 없음")).toBeInTheDocument();
  });

  it("reconnecting 이면 재연결 시도 중 배너를 띄운다", async () => {
    mockUseAuthSession.mockReturnValue({
      session: { accountId: "1", role: "staff", status: "active", academy: { id: "1", name: "테스트 학원" } },
    });
    mockConnectionState = "reconnecting";
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue(emptyLive);
    render(<DashboardPage />);

    expect(await screen.findByText("재연결 시도 중입니다")).toBeInTheDocument();
  });

  it("connected 상태면 두 배너 모두 뜨지 않는다", async () => {
    mockUseAuthSession.mockReturnValue({
      session: { accountId: "1", role: "staff", status: "active", academy: { id: "1", name: "테스트 학원" } },
    });
    mockConnectionState = "connected";
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue(emptyLive);
    render(<DashboardPage />);
    await screen.findByText("1호차");

    expect(screen.queryByText("실시간 연결 끊김")).not.toBeInTheDocument();
    expect(screen.queryByText("재연결 시도 중입니다")).not.toBeInTheDocument();
  });

  // 게이트 판정(verdict-W.md) 이 지적한 빈틈 — 배너(wsIsLost)와 빈 목록 문구
  // (liveRuns.length === 0)가 같은 조건 하나로 묶여도 기존 시험은 전부
  // liveRuns 가 빈 목록이라 못 잡는다. 목록에 항목이 있는 상태에서 연결이
  // 끊긴 경우를 더해 두 조건이 서로 무관함을 고정한다.
  it("목록에 항목이 있어도(liveRuns 비어있지 않음) 연결이 끊기면 배너가 뜨고, 빈 목록 문구는 뜨지 않는다", async () => {
    mockUseAuthSession.mockReturnValue({
      session: { accountId: "1", role: "staff", status: "active", academy: { id: "1", name: "테스트 학원" } },
    });
    mockConnectionState = "gaveUp";
    mockGetDashboard.mockResolvedValue(baseDashboard);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
    render(<DashboardPage />);

    // baseLiveRun 은 position 이 null 이라 "위치 확인 대기" 로 렌더된다 — 목록이
    // 실제로 채워졌다는 것을 보여주는 유일한 표식이다("1호차"는 대시보드 표에도 있어 유일하지 않다).
    expect(await screen.findByText("실시간 연결 끊김")).toBeInTheDocument();
    expect(await screen.findByText("위치 확인 대기")).toBeInTheDocument();
    expect(screen.queryByText("지금 이동 중인 버스가 없습니다")).not.toBeInTheDocument();
  });
});
