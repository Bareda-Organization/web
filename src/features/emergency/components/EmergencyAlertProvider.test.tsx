import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import type { WebSocketEnvelope } from "@/shared/lib/ws";
import { createStableRouter } from "@/shared/testing/stableRouter";
import { ackEmergency, getEmergencies } from "../api";
import { EmergencyAlertProvider, EmergencyAlertStrip, useEmergencyUnackedCount } from "./EmergencyAlertProvider";

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({ session: { academy: { id: "7", name: "바래다" } } }),
}));
const mockPush = vi.fn();
const mockRouter = createStableRouter({ push: mockPush });
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));

let capturedOnEnvelope: ((envelope: WebSocketEnvelope) => void) | undefined;
let capturedOnReconnected: (() => void) | undefined;
vi.mock("@/shared/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks")>()),
  useRealtimeChannel: (_destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void, onReconnected?: () => void) => {
    capturedOnEnvelope = onEnvelope;
    capturedOnReconnected = onReconnected;
    return { connectionState: "connected" };
  },
}));
vi.mock("../api", () => ({ getEmergencies: vi.fn(), ackEmergency: vi.fn() }));

const mockGet = vi.mocked(getEmergencies);
const mockAck = vi.mocked(ackEmergency);

const envelope = (event: string, payload: Record<string, unknown>): WebSocketEnvelope =>
  ({ event, runId: "1", payload }) as unknown as WebSocketEnvelope;

const RAISED = {
  emergency_id: 9,
  type: "accident",
  bus_no: "2호차",
  raised_by: { name: "김기사", role: "driver", phone: "010-1111-2222" },
  position: { lat: 37.5, lng: 127.0 },
  rider_count: 3,
  raised_at: "2026-09-13T00:00:00Z",
};

const ITEM = {
  emergencyId: "9",
  type: "accident" as const,
  memo: null,
  raisedBy: { name: "김기사", role: "driver" as const, phone: "010-1111-2222" },
  runId: "1",
  busNo: "2호차",
  direction: "to_academy" as const,
  position: { lat: 37.5, lng: 127.0, recordedAt: null },
  riderCount: 3,
  contacts: [],
  raisedAt: "2026-09-13T00:00:00Z",
  ackedAt: null,
  canceledAt: null,
  acked: false,
  ackedBy: null,
};

const CountProbe = () => <span>{`미확인 ${useEmergencyUnackedCount()}건`}</span>;

const renderProvider = () =>
  render(
    <EmergencyAlertProvider>
      <CountProbe />
      <EmergencyAlertStrip />
      <p>현재 화면</p>
    </EmergencyAlertProvider>,
  );

// R32-W5 — 실시간 비상 알림이 대시보드 한 줄뿐이라 다른 화면에서는 안 보이고, 다른 알림에 덮였다.
describe("EmergencyAlertProvider — 관계자 전 화면 비상 팝업", () => {
  afterEach(() => vi.clearAllMocks());

  it("emergency_raised 를 받으면 어느 화면에서든 한글 유형의 팝업과 사이드바용 건수를 띄운다", async () => {
    mockGet.mockResolvedValue({ items: [], unackedCount: 0 });
    renderProvider();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    act(() => capturedOnEnvelope?.(envelope("emergency_raised", RAISED)));

    expect(await screen.findByText(/2호차/)).toBeInTheDocument();
    expect(screen.getByText(/사고/)).toBeInTheDocument();
    expect(screen.queryByText(/accident/)).not.toBeInTheDocument();
    expect(screen.getByText("미확인 1건")).toBeInTheDocument();
  });

  it("다른 알림(탑승 승인 요청 등)이 뒤에 와도 확인 전까지 팝업이 남는다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    renderProvider();
    await screen.findByText(/2호차/);

    act(() =>
      capturedOnEnvelope?.(envelope("approval_requested", { approval_id: 5, student_name: "박학생", run_id: 1, stop_name: "정문" })),
    );

    expect(screen.getByText(/2호차/)).toBeInTheDocument();
  });

  it("확인 버튼은 ack 를 보내고 팝업을 닫는다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    mockAck.mockResolvedValue({ emergencyId: "9", ackedAt: "2026-09-13T00:00:10Z" });
    renderProvider();
    await screen.findByText(/2호차/);

    mockGet.mockResolvedValue({ items: [], unackedCount: 0 });
    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => expect(mockAck).toHaveBeenCalledWith("9"));
    await waitFor(() => expect(screen.queryByText(/2호차/)).not.toBeInTheDocument());
    expect(screen.getByText("미확인 0건")).toBeInTheDocument();
  });

  it("비상 목록 링크는 /emergency 로 이동한다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    renderProvider();
    await screen.findByText(/2호차/);

    fireEvent.click(screen.getByRole("button", { name: "비상 알림 목록" }));

    expect(mockPush).toHaveBeenCalledWith("/emergency");
  });

  it("emergency_canceled 를 받으면 그 팝업이 사라진다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    renderProvider();
    await screen.findByText(/2호차/);

    mockGet.mockResolvedValue({ items: [], unackedCount: 0 });
    act(() => capturedOnEnvelope?.(envelope("emergency_canceled", { emergency_id: 9, bus_no: "2호차", canceled_at: "x" })));

    await waitFor(() => expect(screen.queryByText(/2호차/)).not.toBeInTheDocument());
  });
});

// F01-12 — ack 직전에 나간 폴링의 옛 응답이 방금 닫은 팝업을 되살리거나, 이미 처리된 건을 실패로 안내하면 안 된다.
describe("EmergencyAlertProvider — 확인(ack) 경합·실패 문구(F01-12)", () => {
  afterEach(() => vi.clearAllMocks());

  it("ack 성공 뒤에 도착한 ack 이전 폴링 응답이 팝업을 되살리지 않는다", async () => {
    let resolveStale: (value: { items: (typeof ITEM)[]; unackedCount: number }) => void = () => {};
    mockGet.mockResolvedValueOnce({ items: [ITEM], unackedCount: 1 });
    renderProvider();
    await screen.findByText(/2호차/);

    // ack 전에 나간 요청 하나(서버는 아직 미확인으로 답한다)를 붙잡아 둔다.
    mockGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
    );
    act(() => capturedOnEnvelope?.(envelope("emergency_canceled", { emergency_id: 99, bus_no: "9호차", canceled_at: "x" })));
    mockAck.mockResolvedValue({ emergencyId: "9", ackedAt: "2026-09-13T00:00:10Z" });
    mockGet.mockResolvedValue({ items: [], unackedCount: 0 });
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() => expect(screen.queryByText(/2호차/)).not.toBeInTheDocument());

    await act(async () => resolveStale({ items: [ITEM], unackedCount: 1 }));

    expect(screen.queryByText(/2호차/)).not.toBeInTheDocument();
  });

  it("다른 관계자가 먼저 확인한 건(409 ALREADY_ACKED)은 실패가 아니라 성공으로 다루어 팝업을 닫는다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    mockAck.mockRejectedValue(new ApiError(409, "ALREADY_ACKED", "이미 확인됨"));
    renderProvider();
    await screen.findByText(/2호차/);

    mockGet.mockResolvedValue({ items: [], unackedCount: 0 });
    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => expect(screen.queryByText(/2호차/)).not.toBeInTheDocument());
    expect(screen.queryByText(/확인 처리에 실패했습니다/)).not.toBeInTheDocument();
  });

  it("확인 실패 문구는 실패한 그 알림이 사라지면 함께 사라져 새 비상 건 옆에 남지 않는다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    mockAck.mockRejectedValue(new Error("네트워크"));
    renderProvider();
    await screen.findByText(/2호차/);
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await screen.findByText(/확인 처리에 실패했습니다/);

    mockGet.mockResolvedValue({ items: [{ ...ITEM, emergencyId: "10", busNo: "3호차" }], unackedCount: 1 });
    act(() => capturedOnEnvelope?.(envelope("emergency_canceled", { emergency_id: 9, bus_no: "2호차", canceled_at: "x" })));

    expect(await screen.findByText(/3호차/)).toBeInTheDocument();
    expect(screen.queryByText(/확인 처리에 실패했습니다/)).not.toBeInTheDocument();
  });
});

// R46-WEB B1 #1 — 띠가 화면 위에 떠(fixed) 등록·배치 변경 버튼을 가렸다. 흐름 속에 놓여야 아래 내용을 밀어 낸다.
describe("EmergencyAlertStrip — 버튼을 가리지 않는 위치", () => {
  afterEach(() => vi.clearAllMocks());

  it("화면 위에 띄우지 않고(fixed 아님) 흐름 속에 놓는다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    renderProvider();

    await screen.findByText(/2호차/);
    const strip = screen.getAllByRole("alert")[0]!; // 바깥 띠(안쪽 배너도 alert 역할이라 첫 번째가 띠)

    expect(getComputedStyle(strip).position).not.toBe("fixed");
  });
});

// R46-WEB A#6 — 메인 관리자 레이아웃도 같은 띠를 쓰되, 확인 주체는 관계자라 확인 버튼이 없다.
describe("EmergencyAlertProvider — 메인 관리자 출처", () => {
  afterEach(() => vi.clearAllMocks());

  it("넘겨 받은 조회·채널을 쓰고 확인 버튼 없이 목록 링크만 보여 준다", async () => {
    const fetchUnacked = vi.fn(async () => [{ emergencyId: "4", busNo: "3호차", type: "accident", raisedByName: null }]);
    render(
      <EmergencyAlertProvider source={{ destination: "/topic/admin/live", fetchUnacked, listPath: "/emergency-alerts" }}>
        <CountProbe />
        <EmergencyAlertStrip />
      </EmergencyAlertProvider>,
    );

    expect(await screen.findByText(/3호차/)).toBeInTheDocument();
    expect(screen.getByText("미확인 1건")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "확인" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "비상 알림 목록" }));
    expect(mockPush).toHaveBeenCalledWith("/emergency-alerts");
    expect(mockGet).not.toHaveBeenCalled();
  });
});

// R46-FUWEB B1 #1 — 비상 띠가 본문을 오래 밀어 내려도 접을 방법이 없었다. 접어도 건수는 남고, 새 비상은 접힌 띠를 다시 펼친다.
describe("EmergencyAlertStrip — 접기", () => {
  afterEach(() => vi.clearAllMocks());

  it("접기를 누르면 신고 내용 대신 미확인 건수 한 줄만 남고, 펼치기로 되돌린다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    renderProvider();
    await screen.findByText(/2호차/);

    fireEvent.click(screen.getByRole("button", { name: "접기" }));

    expect(screen.queryByText(/2호차/)).not.toBeInTheDocument();
    expect(screen.getByText("미확인 비상 알림 1건")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "펼치기" }));

    expect(screen.getByText(/2호차/)).toBeInTheDocument();
  });

  it("접은 뒤에 새 비상이 들어오면 다시 펼쳐 새 신고를 보여 준다", async () => {
    mockGet.mockResolvedValue({ items: [ITEM], unackedCount: 1 });
    renderProvider();
    await screen.findByText(/2호차/);
    fireEvent.click(screen.getByRole("button", { name: "접기" }));

    mockGet.mockResolvedValue({
      items: [ITEM, { ...ITEM, emergencyId: "10", busNo: "3호차" }],
      unackedCount: 2,
    });
    act(() => capturedOnEnvelope?.(envelope("emergency_raised", { ...RAISED, emergency_id: 10, bus_no: "3호차" })));

    expect(await screen.findByText(/3호차/)).toBeInTheDocument();
  });
});

// R46-FIXCONN C-1 ②·C-6 — 근무 중 관계자는 다른 창을 보는 것이 평상 사용이다. 숨은 탭에서도 비상 폴링이 멈추면 안 되고,
// 연결이 끊겼다 돌아온 직후에는 끊긴 사이의 신고를 REST 로 한 번 받아 온다.
describe("EmergencyAlertProvider — 숨은 탭·재연결 보충(R46-FIXCONN)", () => {
  const setHidden = (hidden: boolean) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event("visibilitychange"));
  };
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
    mockGet.mockResolvedValue({ items: [], unackedCount: 0 });
  });
  afterEach(() => {
    setHidden(false);
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  const advance = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  it("탭이 숨어도 비상 폴링이 멈추지 않는다 — 30초 간격으로 계속 받고, 다시 보이면 바로 받는다", async () => {
    renderProvider();
    await advance(0);
    const afterMount = mockGet.mock.calls.length;

    act(() => setHidden(true));
    await advance(29_999);
    expect(mockGet.mock.calls.length).toBe(afterMount);
    await advance(1);
    expect(mockGet.mock.calls.length).toBe(afterMount + 1);

    act(() => setHidden(false));
    await advance(0);
    expect(mockGet.mock.calls.length).toBe(afterMount + 2);
  });

  it("연결이 끊겼다 돌아오면 폴링 주기를 기다리지 않고 미확인 비상 목록을 다시 받는다", async () => {
    renderProvider();
    await advance(0);
    const before = mockGet.mock.calls.length;

    await act(async () => capturedOnReconnected?.());

    expect(mockGet.mock.calls.length).toBe(before + 1);
  });
});
