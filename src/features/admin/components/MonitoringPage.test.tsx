import { render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonitoringPage } from "./MonitoringPage";
import { getAcademies, getAcademyRunsLive } from "../api";
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

const mockGetAcademies = vi.mocked(getAcademies);
const mockGetRunsLive = vi.mocked(getAcademyRunsLive);

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
    // 실제로 채워졌다는 것을 보여주는 유일한 표식이다.
    expect(await screen.findByText("실시간 연결 끊김")).toBeInTheDocument();
    expect(await screen.findByText("위치 확인 대기")).toBeInTheDocument();
    expect(screen.queryByText("지금 운행 중인 회차가 없습니다")).not.toBeInTheDocument();
  });
});
