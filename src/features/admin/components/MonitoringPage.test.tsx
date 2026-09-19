import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonitoringPage } from "./MonitoringPage";
import { getAcademies, getAcademyRunsLive } from "../api";
import { getRunRoute } from "@/features/route";
import type { RunLiveItemResponseTypes } from "../types";
import { ApiError } from "@/shared/lib/http";
import type { WebSocketEnvelope, WsConnectionState } from "@/shared/lib/ws";

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 학원 목록 조회(진입점)가
// 실패하면 오류 문구가 뜨고, 회차 조회(getAcademyRunsLive)로는 넘어가지 않는지를 본다
// — academyId 가 정해지지 않은 채로 회차 조회를 시도하면 안 된다.
//
// FE-R2 W 목표 1 — 조회 실패 시 EmptyState("등록된 학원이 없습니다" · "지금 운행 중인
// 회차가 없습니다")가 오류 배너와 동시에 뜨던 것을 고쳤다(MonitoringPage.tsx !error
// 가드, 두 갈래 모두). 아래 두 검사가 그 가드를 고정한다 — 가드를 지우면 이 검사들만
// 실패해야 한다.
vi.mock("../api", () => ({
  getAcademies: vi.fn(),
  getAcademyRunsLive: vi.fn(),
}));

// R15-T2 목표 4 — §5.19 를 부르는 getRunRoute 는 features/route 를 통해서만 온다.
vi.mock("@/features/route", () => ({
  getRunRoute: vi.fn(),
}));

const mockGetAcademies = vi.mocked(getAcademies);
const mockGetRunsLive = vi.mocked(getAcademyRunsLive);
const mockGetRunRoute = vi.mocked(getRunRoute);

// Goal 8·9 시험은 실제 WebSocket 을 열지 않는다 — `useRealtimeChannel` 을 가짜로
// 바꿔 봉투 전달과 연결 상태를 직접 제어한다(DashboardPage.test.tsx 와 같은 방식,
// 훅 내부는 `useRealtimeChannel.test.ts` 가 따로 검증한다).
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

const baseAcademies = {
  items: [{ id: 1, code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" as const }],
  page: 1,
  size: 20,
  totalCount: 1,
  hasNext: false,
};

const baseLiveRun: RunLiveItemResponseTypes = {
  runId: 1,
  busNo: "1호차",
  direction: "to_academy",
  runStatus: "moving",
  position: null,
  lastSeenAt: null,
  departTime: "08:00",
  estDepartTime: "08:00",
  stops: [],
  destinationEta: null,
  driver: { name: "김기사", phone: "010" },
  escort: { name: "박매니저", phone: "010" },
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

describe("MonitoringPage — 학원 목록 조회 실패", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("학원 목록 조회가 실패하면 오류 문구를 보여주고 회차 조회로 넘어가지 않는다", async () => {
    mockGetAcademies.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<MonitoringPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(mockGetRunsLive).not.toHaveBeenCalled();
  });

  it("학원 목록 조회가 실패하면 EmptyState 는 뜨지 않는다 — '정말 0건' 과 '조회 실패' 를 구별한다", async () => {
    mockGetAcademies.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<MonitoringPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(screen.queryByText("등록된 학원이 없습니다")).not.toBeInTheDocument();
  });
});

describe("MonitoringPage — 실시간 회차 조회 실패", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("회차 조회가 실패하면 EmptyState 는 뜨지 않는다 — '정말 0건' 과 '조회 실패' 를 구별한다", async () => {
    mockGetAcademies.mockResolvedValue({
      items: [{ id: 1, code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" }],
      page: 1,
      size: 20,
      totalCount: 1,
      hasNext: false,
    });
    mockGetRunsLive.mockRejectedValue(new ApiError(500, "UNKNOWN", "실시간 회차 조회 중 오류가 발생했습니다"));
    render(<MonitoringPage />);

    await waitFor(() => expect(screen.getByText("실시간 회차 조회 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(screen.queryByText("지금 운행 중인 회차가 없습니다")).not.toBeInTheDocument();
  });
});

// Goal 8 — `/topic/admin/live` 배선. `useRealtimeChannel` 을 가짜로 바꿔 두므로
// 여기서는 실제 WebSocket 연결을 열지 않고 `capturedOnEnvelope` 를 직접 호출해
// 봉투 수신을 흉내 낸다.
describe("MonitoringPage — 실시간 이벤트 배선(Goal 8)", () => {
  beforeEach(() => {
    mockConnectionState = "connected";
    capturedOnEnvelope = undefined;
    mockGetAcademies.mockResolvedValue(baseAcademies);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("position 이벤트는 REST 재조회 없이 해당 회차의 좌표만 직접 갱신한다", async () => {
    render(<MonitoringPage />);
    await screen.findByText("위치 확인 대기");

    const callsBefore = mockGetRunsLive.mock.calls.length;
    act(() => {
      capturedOnEnvelope?.(envelope("position", { lat: 37.5, lng: 127.0, received_at: "2026-09-13T00:00:01Z" }));
    });

    await screen.findByText("수신 2026-09-13T00:00:01Z");
    expect(mockGetRunsLive.mock.calls.length).toBe(callsBefore);
  });

  it.each(["stop_arrived", "rider_changed", "run_started", "run_ended"] as const)(
    "%s 이벤트는 선택된 학원의 회차 목록을 재조회한다",
    async (event) => {
      render(<MonitoringPage />);
      await screen.findByText("위치 확인 대기");

      const callsBefore = mockGetRunsLive.mock.calls.length;
      act(() => {
        capturedOnEnvelope?.(envelope(event, {}));
      });

      await waitFor(() => expect(mockGetRunsLive.mock.calls.length).toBe(callsBefore + 1));
    },
  );

  it("emergency_raised 이벤트는 학원 필터와 무관하게 비상 배너를 띄운다", async () => {
    render(<MonitoringPage />);
    await screen.findByText("위치 확인 대기");

    act(() => {
      capturedOnEnvelope?.(
        envelope("emergency_raised", {
          emergency_id: 1,
          type: "accident",
          bus_no: "2호차",
          raised_by: { name: "김기사", role: "driver", phone: "010" },
          position: { lat: 37.5, lng: 127.0 },
          rider_count: 3,
          raised_at: "2026-09-13T00:00:00Z",
        }),
      );
    });

    expect(await screen.findByText("비상 상황 발생 — 2호차 호차 (accident)")).toBeInTheDocument();
  });
});

// Goal 9 — "데이터 없음"과 "WebSocket 연결 끊김"을 구분한다. REST 폴링이 채우는
// 목록·EmptyState 는 그대로 두고, WS 상태 배너만 추가로 뜨는지를 본다.
describe("MonitoringPage — WS 연결 상태 배너(Goal 9)", () => {
  beforeEach(() => {
    capturedOnEnvelope = undefined;
    mockGetAcademies.mockResolvedValue(baseAcademies);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("gaveUp 이면 '실시간 연결 끊김' 배너가 뜨고, EmptyState 는 그대로 유지된다", async () => {
    mockConnectionState = "gaveUp";
    render(<MonitoringPage />);

    expect(await screen.findByText("실시간 연결 끊김")).toBeInTheDocument();
    expect(await screen.findByText("지금 운행 중인 회차가 없습니다")).toBeInTheDocument();
  });

  it("forbidden 이면 '실시간 조회 권한 없음' 배너가 뜬다", async () => {
    mockConnectionState = "forbidden";
    render(<MonitoringPage />);

    expect(await screen.findByText("실시간 조회 권한 없음")).toBeInTheDocument();
  });

  it("reconnecting 이면 '재연결 시도 중입니다' 배너가 뜬다", async () => {
    mockConnectionState = "reconnecting";
    render(<MonitoringPage />);

    expect(await screen.findByText("재연결 시도 중입니다")).toBeInTheDocument();
  });

  it("connected 이면 두 배너 모두 뜨지 않는다", async () => {
    mockConnectionState = "connected";
    render(<MonitoringPage />);

    await screen.findByText("지금 운행 중인 회차가 없습니다");
    expect(screen.queryByText("실시간 연결 끊김")).not.toBeInTheDocument();
    expect(screen.queryByText("실시간 조회 권한 없음")).not.toBeInTheDocument();
    expect(screen.queryByText("재연결 시도 중입니다")).not.toBeInTheDocument();
  });

  // 게이트 판정(verdict-W.md) 이 지적한 빈틈 — 배너(wsIsLost)와 빈 목록 EmptyState
  // (runs.length === 0)가 같은 조건 하나로 묶여도 기존 시험은 전부 runs 가 빈
  // 목록이라 못 잡는다. 목록에 항목이 있는 상태에서 연결이 끊긴 경우를 더해
  // 두 조건이 서로 무관함을 고정한다.
  it("목록에 항목이 있어도(runs 비어있지 않음) 연결이 끊기면 배너가 뜨고, EmptyState 는 뜨지 않는다", async () => {
    mockConnectionState = "gaveUp";
    mockGetAcademies.mockResolvedValue(baseAcademies);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
    render(<MonitoringPage />);

    // baseLiveRun 은 position 이 null 이라 "위치 확인 대기" 로 렌더된다 — 목록이
    // 실제로 채워졌다는 것을 보여주는 유일한 표식이다. 이 표식을 먼저 기다려
    // runs 가 채워진 뒤의 상태에서 배너를 확인한다 — 그러지 않으면 마운트
    // 직후(runs 가 아직 빈 배열인 순간)의 배너만 우연히 잡고 넘어간다.
    expect(await screen.findByText("위치 확인 대기")).toBeInTheDocument();
    expect(await screen.findByText("실시간 연결 끊김")).toBeInTheDocument();
    expect(screen.queryByText("지금 운행 중인 회차가 없습니다")).not.toBeInTheDocument();
  });
});

// R15-T2 §8.23 목표 2·4·5 — 이 화면은 layout 만 바뀐다(Ruling 313, moving 전용
// 유지). 버스를 고르면 그 노선을 지도에 그리고, 근사 경로면 안내한다.
describe("MonitoringPage — 버스 목록 클릭·노선 표시(R15-T2)", () => {
  beforeEach(() => {
    capturedOnEnvelope = undefined;
    mockConnectionState = "connected";
    mockGetAcademies.mockResolvedValue(baseAcademies);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("버스 목록 항목을 클릭하면 그 회차의 §5.19 노선을 조회하고, 근사 경로면 안내한다", async () => {
    mockGetRunRoute.mockResolvedValue({
      roadPath: [
        { lat: 37.1, lng: 127.1 },
        { lat: 37.2, lng: 127.2 },
      ],
      fallbackUsed: true,
    });
    render(<MonitoringPage />);

    // 우측 버스 목록 항목 — RosterTable 의 "1호차"(busNo 단독 열)와 겹치지
    // 않도록 방향까지 묶은 문구로 고른다(DashboardPage.test.tsx 와 같은 방식).
    fireEvent.click(await screen.findByText("1호차 · 등원"));

    expect(mockGetRunRoute).toHaveBeenCalledWith(1);
    expect(await screen.findByText("근사 경로")).toBeInTheDocument();
  });

  it("이미 고른 버스를 다시 클릭하면 선택을 해제하고 근사 경로 안내도 사라진다", async () => {
    mockGetRunRoute.mockResolvedValue({ roadPath: [{ lat: 37.1, lng: 127.1 }], fallbackUsed: true });
    render(<MonitoringPage />);

    const busItem = await screen.findByText("1호차 · 등원");
    fireEvent.click(busItem);
    expect(await screen.findByText("근사 경로")).toBeInTheDocument();

    fireEvent.click(busItem);
    expect(screen.queryByText("근사 경로")).not.toBeInTheDocument();
    expect(mockGetRunRoute).toHaveBeenCalledTimes(1);
  });
});

// R16 §8.25 목표 7 — §6.8 이 오늘 회차 4종 상태를 전부 주도록 넓혀졌다(Ruling 315).
// 이 화면은 받은 것을 거르지 않고 그대로 그려야 한다. ⚠ 특히 `finished` 는
// 사용자가 "운행종료 버스도 목록에 남긴다" 로 확정한 항목이라(Ruling 310) 단독으로 못박는다.
describe("MonitoringPage — 버스 상태 목록 4종(R16)", () => {
  beforeEach(() => {
    capturedOnEnvelope = undefined;
    mockConnectionState = "connected";
    mockGetAcademies.mockResolvedValue(baseAcademies);
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false });
  });

  it("idle·confirmed·moving·finished 가 모두 목록에 남는다", async () => {
    mockGetRunsLive.mockResolvedValue({
      runs: [
        { ...baseLiveRun, runId: 11, busNo: "1호차", runStatus: "idle" },
        { ...baseLiveRun, runId: 12, busNo: "2호차", runStatus: "confirmed" },
        { ...baseLiveRun, runId: 13, busNo: "3호차", runStatus: "moving" },
        { ...baseLiveRun, runId: 14, busNo: "4호차", runStatus: "finished" },
      ],
    });
    render(<MonitoringPage />);

    // ⚠ 상태 문구("대기"·"종료")는 아래 표에도 나오므로 화면 전체에서 찾으면 중복이다.
    // 목록 항목은 버튼이라 그 이름(버스 번호)으로 좁혀 각 버튼 안의 상태를 읽는다.
    const expected: Array<[string, string]> = [
      ["1호차", "대기"],
      ["2호차", "확정"],
      ["3호차", "이동 중"],
      ["4호차", "종료"],
    ];
    for (const [busNo, label] of expected) {
      const item = await screen.findByRole("button", { name: new RegExp(busNo) });
      expect(item).toHaveTextContent(label);
    }
  });

  it("운행이 끝난 버스만 남아도 목록에서 사라지지 않는다", async () => {
    mockGetRunsLive.mockResolvedValue({
      runs: [{ ...baseLiveRun, runId: 21, busNo: "9호차", runStatus: "finished" }],
    });
    render(<MonitoringPage />);

    const item = await screen.findByRole("button", { name: /9호차/ });
    expect(item).toHaveTextContent("종료");
    expect(screen.queryByText("표시할 버스가 없습니다")).not.toBeInTheDocument();
  });
});
