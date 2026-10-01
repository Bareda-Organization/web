import { render, screen, waitFor, act, fireEvent, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MonitoringPage } from "./MonitoringPage";
import { getAcademyRunsLive, getAllAcademies, getEmergencies, getRunAttention } from "../api";
import { getRunRoute } from "@/features/route";
import { SELECTED_BUS_MAP_ZOOM } from "@/features/map";
import type { MapSurfaceProps } from "@/features/map";
import type { RunLiveItemResponseTypes } from "../types";
import { ApiError } from "@/shared/lib/http";
import type { WebSocketEnvelope, WsConnectionState } from "@/shared/lib/ws";

// R18-B 목표 2 — `MapSurface` 를 목으로 바꿔 이 화면이 계산한 `camera` 값이 그
// 컴포넌트에 무엇으로 전달되는지만 검증한다(SDK 렌더링이 아니라 화면의 계산
// 로직 검증 — TodayRunPage.test.tsx 와 같은 방식).
const mockMapSurface = vi.fn<(props: MapSurfaceProps) => null>(() => null);
// R18-B2 — `cameraForSelectedBus`·`buildRouteDisplayState` 는 실제 구현을 그대로
// 쓴다(순수 함수라 SDK 에 안 걸린다). `MapSurface` 만 목으로 바꾼다.
vi.mock("@/features/map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/map")>();
  return {
    ...actual,
    MapSurface: (props: MapSurfaceProps) => mockMapSurface(props),
  };
});

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 학원 목록 조회(진입점)가
// 실패하면 오류 문구가 뜨고, 회차 조회(getAcademyRunsLive)로는 넘어가지 않는지를 본다
// — academyId 가 정해지지 않은 채로 회차 조회를 시도하면 안 된다.
//
// FE-R2 W 목표 1 — 조회 실패 시 EmptyState("등록된 학원이 없습니다" · "지금 운행 중인
// 회차가 없습니다")가 오류 배너와 동시에 뜨던 것을 고쳤다(MonitoringPage.tsx !error
// 가드, 두 갈래 모두). 아래 두 검사가 그 가드를 고정한다 — 가드를 지우면 이 검사들만
// 실패해야 한다.
vi.mock("../api", () => ({
  getAllAcademies: vi.fn(),
  getAcademyRunsLive: vi.fn(),
  getEmergencies: vi.fn(async () => ({ items: [], unackedCount: 0 })),
  getRunAttention: vi.fn(async () => ({ items: [] })),
}));

// R15-T2 목표 4 — §5.19 를 부르는 getRunRoute 는 features/route 를 통해서만 온다.
vi.mock("@/features/route", () => ({
  getRunRoute: vi.fn(),
}));

const mockGetAcademies = vi.mocked(getAllAcademies);
const mockGetRunsLive = vi.mocked(getAcademyRunsLive);
const mockGetRunRoute = vi.mocked(getRunRoute);
const mockGetEmergencies = vi.mocked(getEmergencies);
const mockGetRunAttention = vi.mocked(getRunAttention);

// Goal 8·9 시험은 실제 WebSocket 을 열지 않는다 — `useRealtimeChannel` 을 가짜로
// 바꿔 봉투 전달과 연결 상태를 직접 제어한다(DashboardPage.test.tsx 와 같은 방식,
// 훅 내부는 `useRealtimeChannel.test.ts` 가 따로 검증한다).
let capturedOnEnvelope: ((envelope: WebSocketEnvelope) => void) | undefined;
let mockConnectionState: WsConnectionState = "connected";
let capturedOnReconnected: (() => void) | undefined;
const mockUseRealtimeChannel = vi.fn((_destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void, onReconnected?: () => void) => {
  capturedOnEnvelope = onEnvelope;
  capturedOnReconnected = onReconnected;
  return { connectionState: mockConnectionState, reconnect: vi.fn() };
});
vi.mock("@/shared/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks")>()),
  useRealtimeChannel: (destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void, onReconnected?: () => void) =>
    mockUseRealtimeChannel(destination, onEnvelope, onReconnected),
}));

const baseAcademies = {
  items: [{ id: "1", code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" as const }],
  page: 1,
  size: 20,
  totalCount: 1,
  hasNext: false,
};

const baseLiveRun: RunLiveItemResponseTypes = {
  runId: "1",
  busNo: "1호차",
  direction: "to_academy",
  runStatus: "moving",
  position: null,
  lastSeenAt: null,
  departTime: "08:00",
  confirmAt: "07:30",
  estDepartTime: "08:00",
  stops: [],
  destinationEta: null,
  driver: { name: "김기사", phone: "010" },
  escort: { name: "박매니저", phone: "010" },
  consecutiveFailures: 0,
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
    mockGetAcademies.mockResolvedValue([{ id: "1", code: "A001", name: "테스트 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" }]);
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
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
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

    await screen.findByText("수신 2026-09-13 09:00");
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

    expect(await screen.findByText("비상 상황 발생 — 2호차 (사고)")).toBeInTheDocument();
  });

  it("W3: emergency_raised 뒤 emergency_canceled 를 받으면 알림이 취소 문구로 바뀐다", async () => {
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
    await screen.findByText("비상 상황 발생 — 2호차 (사고)");

    act(() => {
      capturedOnEnvelope?.(
        envelope("emergency_canceled", {
          emergency_id: 1,
          bus_no: "2호차",
          canceled_at: "2026-09-13T00:01:00Z",
        }),
      );
    });

    expect(await screen.findByText("비상 알림 취소 — 2호차")).toBeInTheDocument();
    expect(screen.queryByText("비상 상황 발생 — 2호차 (사고)")).not.toBeInTheDocument();
  });
});

// 연결 끊김 안내는 레이아웃의 연결 띠(`RealtimeConnectionStrip`)가 맡는다(R46-FIXCONN C-12). 이 화면은 REST 폴링이 채운
// 목록·EmptyState 를 연결 상태와 무관하게 그대로 보여 준다.
describe("MonitoringPage — WS 연결 상태와 무관한 목록(Goal 9 → C-12)", () => {
  beforeEach(() => {
    capturedOnEnvelope = undefined;
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
  });

  afterEach(() => {
    mockConnectionState = "connected";
    vi.clearAllMocks();
  });

  it.each(["gaveUp", "forbidden", "reconnecting"] as const)(
    "%s 여도 EmptyState 는 그대로이고, 이 화면은 연결 배너를 따로 띄우지 않는다",
    async (state) => {
      mockConnectionState = state;
      render(<MonitoringPage />);

      expect(await screen.findByText("지금 운행 중인 회차가 없습니다")).toBeInTheDocument();
      expect(screen.queryByText("실시간 연결 끊김")).not.toBeInTheDocument();
      expect(screen.queryByText("실시간 조회 권한 없음")).not.toBeInTheDocument();
      expect(screen.queryByText("재연결 시도 중입니다")).not.toBeInTheDocument();
    },
  );

  // 게이트 판정(verdict-W.md) 이 지적한 빈틈 — 목록에 항목이 있는 상태에서 연결이 끊긴 경우를 더해 EmptyState 가 연결 상태와
  // 같은 조건으로 묶이지 않았음을 고정한다.
  it("목록에 항목이 있어도(runs 비어있지 않음) 연결이 끊기면 목록은 보이고 EmptyState 는 뜨지 않는다", async () => {
    mockConnectionState = "gaveUp";
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
    render(<MonitoringPage />);

    // baseLiveRun 은 position 이 null 이라 "위치 확인 대기" 로 렌더된다 — 목록이 실제로 채워졌다는 유일한 표식이다.
    expect(await screen.findByText("위치 확인 대기")).toBeInTheDocument();
    expect(screen.queryByText("지금 운행 중인 회차가 없습니다")).not.toBeInTheDocument();
  });
});

// R15-T2 docs/archive/rounds/be-rounds-r15-r21.md §8.23 목표 2·4·5 — 이 화면은 layout 만 바뀐다(Ruling 313, moving 전용
// 유지). 버스를 고르면 그 노선을 지도에 그리고, 근사 경로면 안내한다.
describe("MonitoringPage — 버스 목록 클릭·노선 표시(R15-T2)", () => {
  beforeEach(() => {
    capturedOnEnvelope = undefined;
    mockConnectionState = "connected";
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], confirmed: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // W1 목표 3 — 서버가 회차 식별자를 숫자 아닌 문자열로 보내도(§API_SPEC §1.1 전환 뒤 모습을
  // 미리 흉내) 지도 위 버스 마커 클릭이 그 회차를 선택해야 한다. 옛 구현은
  // `Number(markerId)` + `Number.isInteger` 로 "숫자로 읽히는 마커만 회차"로 골라
  // 문자열 id 에서 조용히 선택 실패였다 — 이 검사가 그 회귀를 잡는다.
  it("회차 id 가 숫자로 안 읽히는 문자열이어도 지도 버스 마커 클릭이 그 회차를 선택한다", async () => {
    const stringIdRun: RunLiveItemResponseTypes = {
      ...baseLiveRun,
      runId: "run-a1",
      position: { lat: 37.1, lng: 127.1, receivedAt: "2026-09-13T00:00:01Z" },
    };
    mockGetRunsLive.mockResolvedValue({ runs: [stringIdRun] });
    render(<MonitoringPage />);

    // 목록 항목 텍스트가 뜬 뒤에야 mapMarkers 가 이 회차를 담은 렌더가 끝난 상태다 —
    // 그 전에 onMarkerClick 을 집으면 markers 가 비어 있던 렌더의 낡은 클로저를 잡는다.
    await screen.findByText("1호차 · 등원");
    const onMarkerClick = mockMapSurface.mock.calls.at(-1)?.[0].onMarkerClick;
    expect(onMarkerClick).toBeTypeOf("function");

    act(() => {
      onMarkerClick!("run-a1");
    });

    await waitFor(() => expect(mockGetRunRoute).toHaveBeenCalledWith("run-a1"));
  });

  // F03-07 — "위치" 열이 수신 시각·마지막 확인 시각을 ISO 원문(`…Z`)으로 그렸다.
  it("위치 열은 수신·마지막 확인 시각을 ISO 원문이 아니라 한국 시간으로 보여준다", async () => {
    mockGetRunsLive.mockResolvedValue({
      runs: [
        { ...baseLiveRun, runId: "1", position: { lat: 37.1, lng: 127.1, receivedAt: "2026-09-30T05:10:22Z" } },
        { ...baseLiveRun, runId: "2", busNo: "2호차", position: null, lastSeenAt: "2026-09-30T05:11:00Z" },
      ],
    });
    render(<MonitoringPage />);

    expect(await screen.findByText("수신 2026-09-30 14:10")).toBeInTheDocument();
    expect(screen.getByText("2026-09-30 14:11")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-30T/)).not.toBeInTheDocument();
  });

  it("버스 목록 항목을 클릭하면 그 회차의 §5.19 노선을 조회하고, 근사 경로면 안내한다", async () => {
    mockGetRunRoute.mockResolvedValue({
      roadPath: [
        { lat: 37.1, lng: 127.1 },
        { lat: 37.2, lng: 127.2 },
      ],
      fallbackUsed: true,
      stops: [],
      confirmed: true,
    });
    render(<MonitoringPage />);

    // 우측 버스 목록 항목 — RosterTable 의 "1호차"(busNo 단독 열)와 겹치지
    // 않도록 방향까지 묶은 문구로 고른다(DashboardPage.test.tsx 와 같은 방식).
    fireEvent.click(await screen.findByText("1호차 · 등원"));

    expect(mockGetRunRoute).toHaveBeenCalledWith("1");
    expect(await screen.findByText("근사 경로")).toBeInTheDocument();
  });

  // R19 목표 1 — 정차지도 kind:"stop" 마커로 함께 그린다. 버스 마커(kind:"bus")를
  // 지우지 않고 더하는지, id 로 어느 정차지인지까지 본다(개수만 세는 단언은
  // 범위 조건을 못 잡는다).
  it("버스를 고르면 그 회차의 정차지도 kind:\"stop\" 마커로 함께 그린다", async () => {
    mockGetRunRoute.mockResolvedValue({
      roadPath: [],
      fallbackUsed: false,
      stops: [{ stopId: "3", seq: 1, name: "그린빌라 입구", lat: 37.5685, lng: 126.98 }],
      confirmed: true,
    });
    render(<MonitoringPage />);

    fireEvent.click(await screen.findByText("1호차 · 등원"));

    await waitFor(() =>
      expect(mockMapSurface).toHaveBeenCalledWith(
        expect.objectContaining({
          markers: expect.arrayContaining([{ id: "stop-3", lat: 37.5685, lng: 126.98, kind: "stop", seq: 1 }]),
        }),
      ),
    );
  });

  // R21-A 목표 4 — baseLiveRun 은 position:null(실시간 위치 없음)이다. 이전에는
  // 이 경우 `selectedBusMarker` 가 항상 null 이라 카메라가 기본 좌표(서울 시청)에
  // 머물러, 정차지는 실제로 그려지는데도 화면 밖이라 안 보였다(조율자 실측 —
  // 백엔드는 idle·확정·종료 회차도 stops 를 채워 보낸다). 정차지 두 곳의 평균
  // 좌표로 카메라가 옮겨가는지 정확한 수치로 확인한다(범위가 아니라 값 자체).
  it("실시간 위치가 없는 회차를 골라도 카메라가 정차지 평균 좌표로 옮겨간다", async () => {
    mockGetRunRoute.mockResolvedValue({
      roadPath: [],
      fallbackUsed: false,
      stops: [
        { stopId: "1", seq: 1, name: "정류장A", lat: 37.0, lng: 127.0 },
        { stopId: "2", seq: 2, name: "정류장B", lat: 37.2, lng: 127.2 },
      ],
      confirmed: false,
    });
    render(<MonitoringPage />);

    fireEvent.click(await screen.findByText("1호차 · 등원"));

    await waitFor(() =>
      expect(mockMapSurface).toHaveBeenCalledWith(
        expect.objectContaining({ camera: { lat: 37.1, lng: 127.1, zoom: SELECTED_BUS_MAP_ZOOM } }),
      ),
    );
  });

  it("이미 고른 버스를 다시 클릭하면 선택을 해제하고 근사 경로 안내도 사라진다", async () => {
    mockGetRunRoute.mockResolvedValue({
      roadPath: [{ lat: 37.1, lng: 127.1 }],
      fallbackUsed: true,
      stops: [],
      confirmed: true,
    });
    render(<MonitoringPage />);

    const busItem = await screen.findByText("1호차 · 등원");
    fireEvent.click(busItem);
    expect(await screen.findByText("근사 경로")).toBeInTheDocument();

    fireEvent.click(busItem);
    expect(screen.queryByText("근사 경로")).not.toBeInTheDocument();
    expect(mockGetRunRoute).toHaveBeenCalledTimes(1);
  });

  // R18-B 목표 2 — 버스를 고르면 그 버스를 지도 정중앙에 두고 확대한다.
  it("버스를 고르면 카메라가 그 버스 좌표로 옮겨가고 확대한다", async () => {
    const busWithPosition: RunLiveItemResponseTypes = {
      ...baseLiveRun,
      position: { lat: 37.111, lng: 127.222, receivedAt: "2026-09-13T00:00:01Z" },
    };
    mockGetRunsLive.mockResolvedValue({ runs: [busWithPosition] });
    render(<MonitoringPage />);

    await waitFor(() =>
      expect(mockMapSurface).toHaveBeenCalledWith(
        expect.objectContaining({ camera: { lat: 37.5666103, lng: 126.9783882, zoom: 12 } }),
      ),
    );

    fireEvent.click(await screen.findByText("1호차 · 등원"));

    await waitFor(() =>
      expect(mockMapSurface).toHaveBeenCalledWith(
        expect.objectContaining({ camera: { lat: 37.111, lng: 127.222, zoom: SELECTED_BUS_MAP_ZOOM } }),
      ),
    );
  });

  // R18-B 목표 3 — 좌표가 0개면 "빈 지도"와 구별되는 안내를 띄운다. 이 블록의
  // 기본 목(beforeEach)이 이미 roadPath: [] 라 별도 목 설정이 필요 없다.
  // R20-C 목표 4 — baseLiveRun 은 runStatus:"moving"(확정 이후)이라 좌표 0개는
  // "확정됐지만 경로가 없음"(데이터 결손)이지 "아직 확정 전"이 아니다.
  it("경로 좌표가 0개면 확정됐지만 경로 정보가 아직 없습니다 를 보여주고 근사 경로 안내는 뜨지 않는다", async () => {
    render(<MonitoringPage />);

    fireEvent.click(await screen.findByText("1호차 · 등원"));

    expect(await screen.findByText("확정됐지만 경로 정보가 아직 없습니다")).toBeInTheDocument();
    expect(screen.queryByText("근사 경로")).not.toBeInTheDocument();
  });

  // Ruling 321 — idle 회차인데 백엔드가 confirmed:false·좌표 0개(고정 노선 자체가
  // 없음)를 돌려주면 "확정됐지만 없음"과 다른 문구를 보여준다.
  it("고정 노선이 없는 idle 회차를 고르면 이 회차의 고정 노선이 없습니다 안내를 보여준다", async () => {
    mockGetRunsLive.mockResolvedValue({ runs: [{ ...baseLiveRun, runStatus: "idle" }] });
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], confirmed: false });
    render(<MonitoringPage />);

    fireEvent.click(await screen.findByText("1호차 · 등원"));

    expect(await screen.findByText("이 회차의 고정 노선이 없습니다 — 고정 노선 편성에서 등록하세요")).toBeInTheDocument();
    expect(screen.queryByText("확정됐지만 경로 정보가 아직 없습니다")).not.toBeInTheDocument();
  });

  // Ruling 321 — idle 회차가 고정 노선 기반 "예정" 경로를 받으면 "확정된 경로"로
  // 오인하지 않도록 지도 위에서 알린다.
  it("고정 노선 기반 예정 경로를 받으면 예정 경로 안내를 지도 위에 보여준다", async () => {
    mockGetRunsLive.mockResolvedValue({ runs: [{ ...baseLiveRun, runStatus: "idle" }] });
    mockGetRunRoute.mockResolvedValue({
      roadPath: [{ lat: 37.1, lng: 127.1 }],
      fallbackUsed: false,
      stops: [],
      confirmed: false,
    });
    render(<MonitoringPage />);

    fireEvent.click(await screen.findByText("1호차 · 등원"));

    expect(await screen.findByText(/예정 경로 — 확정 시 달라질 수 있음/)).toBeInTheDocument();
    await waitFor(() =>
      expect(mockMapSurface).toHaveBeenCalledWith(
        expect.objectContaining({
          polylines: [{ id: "route-1", points: [{ lat: 37.1, lng: 127.1 }], kind: "planned", approximate: true }],
        }),
      ),
    );
  });
});

// R20-C 목표 1·2 — 사용자가 직접 시연해 지적한 두 가지. 버스를 골라도 우측 목록
// 카드가 그대로였고(무엇을 눌렀는지 모름), 확정·대기 태그가 같은 색이었다.
describe("MonitoringPage — 선택 표시·상태 색 구분(R20-C)", () => {
  beforeEach(() => {
    capturedOnEnvelope = undefined;
    mockConnectionState = "connected";
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], confirmed: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("버스를 고르면 그 카드에 aria-pressed=true 가 붙고, 고르지 않은 카드는 false 다", async () => {
    mockGetRunsLive.mockResolvedValue({
      runs: [
        { ...baseLiveRun, runId: "1", busNo: "1호차" },
        { ...baseLiveRun, runId: "2", busNo: "2호차" },
      ],
    });
    render(<MonitoringPage />);

    const first = await screen.findByRole("button", { name: /1호차/ });
    const second = await screen.findByRole("button", { name: /2호차/ });
    expect(first).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(first);

    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(second).toHaveAttribute("aria-pressed", "false");
  });

  // 상태-색 매핑이 고정(StatusPill.tsx, C-09)이라 실제 색 대신 서로 다른 class 를
  // 단언한다 — Emotion 은 $status 가 다르면 다른 css 클래스를 생성한다.
  it("확정과 대기는 서로 다른 태그 색(class)을 쓴다", async () => {
    mockGetRunsLive.mockResolvedValue({
      runs: [
        { ...baseLiveRun, runId: "31", busNo: "5호차", runStatus: "idle" },
        { ...baseLiveRun, runId: "32", busNo: "6호차", runStatus: "confirmed" },
      ],
    });
    render(<MonitoringPage />);

    // 같은 라벨이 우측 목록 카드와 아래 회차 표(RosterTable)에 중복돼 뜬다 — 목록
    // 카드(버튼)로 좁혀 그 안의 태그만 비교한다.
    const idleCard = await screen.findByRole("button", { name: /5호차/ });
    const confirmedCard = await screen.findByRole("button", { name: /6호차/ });
    const idlePill = within(idleCard).getByText("대기");
    const confirmedPill = within(confirmedCard).getByText("확정");
    expect(idlePill.className).not.toBe(confirmedPill.className);
  });
});

// R16 docs/archive/rounds/be-rounds-r15-r21.md §8.25 목표 7 — §6.8 이 오늘 회차 4종 상태를 전부 주도록 넓혀졌다(Ruling 315).
// 이 화면은 받은 것을 거르지 않고 그대로 그려야 한다. ⚠ 특히 `finished` 는
// 사용자가 "운행종료 버스도 목록에 남긴다" 로 확정한 항목이라(Ruling 310) 단독으로 못박는다.
describe("MonitoringPage — 버스 상태 목록 4종(R16)", () => {
  beforeEach(() => {
    capturedOnEnvelope = undefined;
    mockConnectionState = "connected";
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunRoute.mockResolvedValue({ roadPath: [], fallbackUsed: false, stops: [], confirmed: true });
  });

  it("idle·confirmed·moving·finished 가 모두 목록에 남는다", async () => {
    mockGetRunsLive.mockResolvedValue({
      runs: [
        { ...baseLiveRun, runId: "11", busNo: "1호차", runStatus: "idle" },
        { ...baseLiveRun, runId: "12", busNo: "2호차", runStatus: "confirmed" },
        { ...baseLiveRun, runId: "13", busNo: "3호차", runStatus: "moving" },
        { ...baseLiveRun, runId: "14", busNo: "4호차", runStatus: "finished" },
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
      runs: [{ ...baseLiveRun, runId: "21", busNo: "9호차", runStatus: "finished" }],
    });
    render(<MonitoringPage />);

    const item = await screen.findByRole("button", { name: /9호차/ });
    expect(item).toHaveTextContent("종료");
    expect(screen.queryByText("표시할 버스가 없습니다")).not.toBeInTheDocument();
  });
});

const raised = (id: number, busNo: string, type = "accident", academyName?: string) =>
  envelope("emergency_raised", {
    emergency_id: id, type, bus_no: busNo,
    ...(academyName ? { academy_id: 7, academy_name: academyName } : {}),
    raised_by: { name: "김기사", role: "driver", phone: "010" },
    position: { lat: 37.5, lng: 127.0 }, rider_count: 3, raised_at: "2026-09-13T00:00:00Z",
  });
const canceled = (id: number, busNo: string) =>
  envelope("emergency_canceled", { emergency_id: id, bus_no: busNo, canceled_at: "2026-09-13T00:01:00Z" });

// F03-05 — 비상 배너가 한 줄짜리 상태라 나중 이벤트가 앞 이벤트를 덮었다.
describe("MonitoringPage — 비상 배너 목록(F03-05)", () => {
  beforeEach(() => {
    mockConnectionState = "connected";
    capturedOnEnvelope = undefined;
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
  });
  afterEach(() => vi.clearAllMocks());

  // Ruling 395 — 메인 관리자는 여러 학원의 신고를 한 채널로 받으므로 배너가 학원명을 보여 준다.
  it("비상 배너가 이벤트의 academy_name 을 보여 준다", async () => {
    render(<MonitoringPage />);
    await screen.findByText("위치 확인 대기");

    act(() => {
      capturedOnEnvelope?.(raised(3, "3호차", "accident", "별빛학원"));
    });
    expect(await screen.findByText("비상 상황 발생 — 별빛학원 · 3호차 (사고)")).toBeInTheDocument();
  });

  it("두 버스의 비상이 함께 보이고, 다른 버스의 취소가 진행 중인 비상을 가리지 않는다", async () => {
    render(<MonitoringPage />);
    await screen.findByText("위치 확인 대기");

    act(() => {
      capturedOnEnvelope?.(raised(1, "3호차"));
      capturedOnEnvelope?.(raised(2, "5호차", "vehicle_fault"));
    });
    expect(await screen.findByText("비상 상황 발생 — 3호차 (사고)")).toBeInTheDocument();
    expect(screen.getByText("비상 상황 발생 — 5호차 (차량 고장)")).toBeInTheDocument();

    act(() => {
      capturedOnEnvelope?.(canceled(1, "3호차"));
    });

    expect(screen.getByText("비상 알림 취소 — 3호차")).toBeInTheDocument();
    expect(screen.getByText("비상 상황 발생 — 5호차 (차량 고장)")).toBeInTheDocument();
  });

  it("[닫기] 로 그 알림만 지운다", async () => {
    render(<MonitoringPage />);
    await screen.findByText("위치 확인 대기");
    act(() => {
      capturedOnEnvelope?.(raised(1, "3호차"));
      capturedOnEnvelope?.(raised(2, "5호차"));
    });
    const banner = (await screen.findByText("비상 상황 발생 — 3호차 (사고)")).closest('[role="alert"], [role="status"]') as HTMLElement;

    fireEvent.click(within(banner).getByRole("button", { name: "닫기" }));

    expect(screen.queryByText("비상 상황 발생 — 3호차 (사고)")).not.toBeInTheDocument();
    expect(screen.getByText("비상 상황 발생 — 5호차 (사고)")).toBeInTheDocument();
  });
});

// W2-01(F03-05·F03-11) — 관제 지도에서 비상 회차의 버스를 강조한다. 회차는 WS 봉투의 `run_id`
// 로 잇는다(payload 의 `bus_no` 는 학원마다 같은 "1호차" 가 있어 다른 학원의 비상이 이 학원의
// 같은 이름 버스를 붉게 만든다).
describe("MonitoringPage — 지도 마커 비상 강조(W2-01)", () => {
  const at = { lat: 37.5, lng: 127.0, receivedAt: "2026-09-13T00:00:00Z" };
  const liveRuns = [
    { ...baseLiveRun, runId: "11", busNo: "3호차", position: at },
    { ...baseLiveRun, runId: "12", busNo: "5호차", position: at },
  ];
  const lastMarkers = () => mockMapSurface.mock.calls.at(-1)?.[0].markers ?? [];
  const emergencyIds = () => lastMarkers().filter((marker) => marker.emergency).map((marker) => marker.id);

  beforeEach(() => {
    mockConnectionState = "connected";
    capturedOnEnvelope = undefined;
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunsLive.mockResolvedValue({ runs: liveRuns });
  });
  afterEach(() => vi.clearAllMocks());

  const raisedFor = (id: number, busNo: string, runId: string) => ({ ...raised(id, busNo), runId });
  const canceledFor = (id: number, busNo: string, runId: string) => ({ ...canceled(id, busNo), runId });

  it("비상을 발신한 회차의 버스 마커만 emergency 가 켜진다", async () => {
    render(<MonitoringPage />);
    await waitFor(() => expect(lastMarkers()).toHaveLength(2));
    expect(emergencyIds()).toEqual([]);

    act(() => {
      capturedOnEnvelope?.(raisedFor(1, "3호차", "11"));
    });

    await waitFor(() => expect(emergencyIds()).toEqual(["11"]));
  });

  it("다른 학원의 회차(이 목록에 없는 run_id)가 같은 버스 이름으로 비상을 내도 이 학원 마커는 안 켜진다", async () => {
    render(<MonitoringPage />);
    await waitFor(() => expect(lastMarkers()).toHaveLength(2));

    act(() => {
      capturedOnEnvelope?.(raisedFor(1, "3호차", "999"));
    });

    await screen.findByText("비상 상황 발생 — 3호차 (사고)");
    expect(emergencyIds()).toEqual([]);
  });

  it("비상이 취소되거나 배너를 닫으면 마커 강조가 꺼진다", async () => {
    render(<MonitoringPage />);
    await waitFor(() => expect(lastMarkers()).toHaveLength(2));
    act(() => {
      capturedOnEnvelope?.(raisedFor(1, "3호차", "11"));
      capturedOnEnvelope?.(raisedFor(2, "5호차", "12"));
    });
    await waitFor(() => expect(emergencyIds()).toEqual(["11", "12"]));

    act(() => {
      capturedOnEnvelope?.(canceledFor(1, "3호차", "11"));
    });
    await waitFor(() => expect(emergencyIds()).toEqual(["12"]));

    const banner = screen.getByText("비상 상황 발생 — 5호차 (사고)").closest('[role="alert"], [role="status"]') as HTMLElement;
    fireEvent.click(within(banner).getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(emergencyIds()).toEqual([]));
  });
});

// F03-10 — 전 학원 방송의 이벤트마다 선택 학원 회차를 재조회했다.
describe("MonitoringPage — 방송 이벤트 재조회 범위(F03-10)", () => {
  beforeEach(() => {
    mockConnectionState = "connected";
    capturedOnEnvelope = undefined;
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
  });
  afterEach(() => vi.clearAllMocks());

  it("지금 보는 학원 목록에 없는 회차의 이벤트는 재조회하지 않고, 있는 회차의 잇단 이벤트는 한 번만 재조회한다", async () => {
    render(<MonitoringPage />);
    await screen.findByText("위치 확인 대기");
    const before = mockGetRunsLive.mock.calls.length;

    act(() => {
      capturedOnEnvelope?.(envelope("rider_changed", {}, "999"));
      capturedOnEnvelope?.(envelope("stop_arrived", {}, "999"));
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(mockGetRunsLive.mock.calls.length).toBe(before);

    act(() => {
      capturedOnEnvelope?.(envelope("rider_changed", {}, "1"));
      capturedOnEnvelope?.(envelope("stop_arrived", {}, "1"));
      capturedOnEnvelope?.(envelope("rider_changed", {}, "1"));
    });
    await waitFor(() => expect(mockGetRunsLive.mock.calls.length).toBe(before + 1));
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(mockGetRunsLive.mock.calls.length).toBe(before + 1);
  });
});

// R46-FIXRT L3 — 관제 회차 목록(`/admin/academies/{id}/runs/live`)은 가장 무거운 GET 이다. 실시간 연결이 살아 있으면 방송이
// 갱신을 가져오므로 폴링은 안전망일 뿐이라 30초로 늦추고, 연결이 끊겼을 때(재연결 중·권한 거부)만 7초를 유지한다.
describe("MonitoringPage — 폴링 간격은 실시간 연결 상태를 따른다(L3)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockConnectionState = "connected";
    capturedOnEnvelope = undefined;
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunsLive.mockResolvedValue({ runs: [baseLiveRun] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const advance = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  it("실시간 연결이 connected 면 7초가 아니라 30초마다 다시 받는다", async () => {
    render(<MonitoringPage />);
    await screen.findByText("위치 확인 대기");
    const before = mockGetRunsLive.mock.calls.length;

    await advance(29_000);
    expect(mockGetRunsLive.mock.calls.length).toBe(before);

    await advance(1_500);
    expect(mockGetRunsLive.mock.calls.length).toBe(before + 1);
  });

  it("실시간 연결이 끊기면(재연결 중) 7초 안전망 폴링으로 돌아가고, 다시 붙으면 바로 한 번 받은 뒤 30초로 늦춘다", async () => {
    const view = render(<MonitoringPage />);
    await screen.findByText("위치 확인 대기");

    mockConnectionState = "reconnecting";
    view.rerender(<MonitoringPage />);
    const afterDrop = mockGetRunsLive.mock.calls.length;
    await advance(7_500);
    expect(mockGetRunsLive.mock.calls.length).toBe(afterDrop + 1);

    // 다시 붙었다 — 끊긴 사이 놓친 방송은 되찾을 길이 없으므로 30초를 기다리지 않고 한 번 받는다(판정은 훅이 하고 콜백으로 알린다).
    mockConnectionState = "connected";
    view.rerender(<MonitoringPage />);
    await act(async () => capturedOnReconnected?.());
    await advance(100);
    const afterBackfill = mockGetRunsLive.mock.calls.length;
    expect(afterBackfill).toBe(afterDrop + 2);

    await advance(10_000);
    expect(mockGetRunsLive.mock.calls.length).toBe(afterBackfill);
  });

  it("권한 거부(forbidden)로 실시간을 못 받는 동안도 7초 폴링을 유지한다", async () => {
    mockConnectionState = "forbidden";
    render(<MonitoringPage />);
    await screen.findByText("위치 확인 대기");
    const before = mockGetRunsLive.mock.calls.length;

    await advance(7_500);

    expect(mockGetRunsLive.mock.calls.length).toBe(before + 1);
  });
});

// F03-09 — 겹친 요청에서 늦은 응답이 새 선택을 덮었다.
describe("MonitoringPage — 늦은 응답이 새 선택을 덮지 않음(F03-09)", () => {
  const academyB = { id: "2", code: "B002", name: "둘째 학원", region: "서울", staffCount: 1, userCount: 1, status: "active" as const };
  beforeEach(() => {
    mockConnectionState = "connected";
    capturedOnEnvelope = undefined;
  });
  afterEach(() => vi.clearAllMocks());

  it("학원을 A→B 로 바꾼 뒤에 A 의 회차 응답이 늦게 와도 B 의 회차를 유지한다", async () => {
    mockGetAcademies.mockResolvedValue([...baseAcademies.items, academyB]);
    let resolveA: (value: { runs: RunLiveItemResponseTypes[] }) => void = () => {};
    mockGetRunsLive.mockImplementation((academyId: string) =>
      academyId === "1"
        ? new Promise((resolve) => (resolveA = resolve))
        : Promise.resolve({ runs: [{ ...baseLiveRun, runId: "20", busNo: "B학원 버스" }] }),
    );
    render(<MonitoringPage />);
    await waitFor(() => expect(mockGetRunsLive).toHaveBeenCalledWith("1"));

    fireEvent.change(screen.getByLabelText("학원"), { target: { value: "2" } });
    expect(await screen.findByText("B학원 버스")).toBeInTheDocument();
    await act(async () => {
      resolveA({ runs: [{ ...baseLiveRun, runId: "10", busNo: "A학원 버스" }] });
    });

    expect(screen.getByText("B학원 버스")).toBeInTheDocument();
    expect(screen.queryByText("A학원 버스")).not.toBeInTheDocument();
  });

  it("버스 1 의 노선 응답이 버스 2 뒤에 도착해도 지도에는 버스 2 의 경로를 그린다", async () => {
    mockGetAcademies.mockResolvedValue(baseAcademies.items);
    mockGetRunsLive.mockResolvedValue({
      runs: [
        { ...baseLiveRun, runId: "1", busNo: "1호차" },
        { ...baseLiveRun, runId: "2", busNo: "2호차" },
      ],
    });
    let resolveFirst: (value: never) => void = () => {};
    mockGetRunRoute.mockImplementation((runId: string) =>
      runId === "1"
        ? new Promise((resolve) => (resolveFirst = resolve as never))
        : Promise.resolve({ roadPath: [{ lat: 2, lng: 2 }, { lat: 2.1, lng: 2.1 }], fallbackUsed: false, stops: [], confirmed: true }),
    );
    render(<MonitoringPage />);
    fireEvent.click(await screen.findByText("1호차 · 등원"));
    fireEvent.click(await screen.findByText("2호차 · 등원"));
    await waitFor(() => expect(mockMapSurface.mock.calls.at(-1)?.[0].polylines?.length).toBeGreaterThan(0));

    await act(async () => {
      resolveFirst({ roadPath: [{ lat: 1, lng: 1 }, { lat: 1.1, lng: 1.1 }], fallbackUsed: false, stops: [], confirmed: true } as never);
    });

    const polylines = mockMapSurface.mock.calls.at(-1)?.[0].polylines ?? [];
    expect(polylines.every((line) => line.points[0].lat === 2)).toBe(true);
  });
});

// B1 #24 — 학원 선택으로 한 곳씩만 보이던 전체 관제에서 어느 학원에 미확인 비상이 있는지 한눈에 보인다.
describe("MonitoringPage — 학원별 미확인 비상 요약(B1 #24)", () => {
  const academies = [
    { id: "1", code: "A001", name: "강동학원", region: "서울", staffCount: 1, userCount: 1, status: "active" as const },
    { id: "2", code: "A002", name: "송파학원", region: "서울", staffCount: 1, userCount: 1, status: "active" as const },
  ];
  const emergency = (id: string, academyId: string, academyName: string, staffAcked = false) =>
    ({ emergencyId: id, academy: { id: academyId, name: academyName, contact: "" }, staffAcked, canceledAt: null }) as never;

  beforeEach(() => {
    mockConnectionState = "connected";
    mockGetAcademies.mockResolvedValue(academies);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
  });
  afterEach(() => vi.clearAllMocks());

  it("미확인 비상이 있는 학원을 건수와 함께 요약하고 학원 선택 목록에도 표시한다", async () => {
    mockGetEmergencies.mockResolvedValue({
      items: [emergency("1", "2", "송파학원"), emergency("2", "2", "송파학원"), emergency("3", "1", "강동학원", true)],
      unackedCount: 2,
    });
    render(<MonitoringPage />);

    expect(await screen.findByRole("button", { name: "송파학원 비상 2건" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /강동학원 비상/ })).not.toBeInTheDocument(); // 확인된 건은 세지 않는다
    expect(screen.getByRole("option", { name: "송파학원 (서울) · 비상 2건" })).toBeInTheDocument();
    expect(mockGetEmergencies).toHaveBeenCalledWith("open");
  });

  it("요약의 학원 버튼을 누르면 그 학원의 회차로 바뀐다", async () => {
    mockGetEmergencies.mockResolvedValue({ items: [emergency("1", "2", "송파학원")], unackedCount: 1 });
    render(<MonitoringPage />);

    fireEvent.click(await screen.findByRole("button", { name: "송파학원 비상 1건" }));

    await waitFor(() => expect(mockGetRunsLive).toHaveBeenLastCalledWith("2"));
  });

  it("비상이 없으면 요약을 그리지 않는다", async () => {
    mockGetEmergencies.mockResolvedValue({ items: [], unackedCount: 0 });
    render(<MonitoringPage />);

    await screen.findByRole("option", { name: "강동학원 (서울)" });
    expect(screen.queryByText(/미확인 비상이 있는 학원/)).not.toBeInTheDocument();
  });
});

// R46-FUFEAT ④(Ruling 543) — 전체 관제에서 어느 학원에 오늘 지연·확정 실패가 있는지도 한눈에 보인다.
describe("MonitoringPage — 학원별 지연·확정 실패 요약(R46-FUFEAT ④)", () => {
  const academies = [
    { id: "1", code: "A001", name: "강동학원", region: "서울", staffCount: 1, userCount: 1, status: "active" as const },
    { id: "2", code: "A002", name: "송파학원", region: "서울", staffCount: 1, userCount: 1, status: "active" as const },
  ];

  beforeEach(() => {
    mockConnectionState = "connected";
    mockGetAcademies.mockResolvedValue(academies);
    mockGetRunsLive.mockResolvedValue({ runs: [] });
    mockGetEmergencies.mockResolvedValue({ items: [], unackedCount: 0 });
  });
  afterEach(() => vi.clearAllMocks());

  it("지연·확정 실패가 있는 학원을 건수와 함께 요약하고 학원 선택 목록에도 표시한다", async () => {
    mockGetRunAttention.mockResolvedValue({
      items: [
        { academyId: "2", delayedRuns: 1, confirmFailedRuns: 2 },
        { academyId: "1", delayedRuns: 0, confirmFailedRuns: 3 },
      ],
    });
    render(<MonitoringPage />);

    expect(await screen.findByRole("button", { name: "송파학원 지연 1건 · 확정 실패 2건" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "강동학원 확정 실패 3건" })).toBeInTheDocument(); // 0 인 쪽은 적지 않는다
    expect(screen.getByRole("option", { name: "송파학원 (서울) · 지연 1건 · 확정 실패 2건" })).toBeInTheDocument();
  });

  it("요약의 학원 버튼을 누르면 그 학원의 회차로 바뀐다", async () => {
    mockGetRunAttention.mockResolvedValue({ items: [{ academyId: "2", delayedRuns: 1, confirmFailedRuns: 0 }] });
    render(<MonitoringPage />);

    fireEvent.click(await screen.findByRole("button", { name: "송파학원 지연 1건" }));

    await waitFor(() => expect(mockGetRunsLive).toHaveBeenLastCalledWith("2"));
  });

  it("문제가 없으면 요약을 그리지 않고, 집계를 못 받아도 관제 화면은 그대로 뜬다", async () => {
    mockGetRunAttention.mockResolvedValue({ items: [] });
    const { unmount } = render(<MonitoringPage />);
    await screen.findByRole("option", { name: "강동학원 (서울)" });
    expect(screen.queryByText(/지연·확정 실패가 있는 학원/)).not.toBeInTheDocument();
    unmount();

    mockGetRunAttention.mockRejectedValue(new Error("network"));
    render(<MonitoringPage />);
    expect(await screen.findByRole("option", { name: "강동학원 (서울)" })).toBeInTheDocument();
  });
});
