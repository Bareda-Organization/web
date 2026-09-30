import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import type { WebSocketEnvelope } from "@/shared/lib/ws";
import { ackEmergency, getEmergencies } from "../api";
import { EmergencyAlertProvider, useEmergencyUnackedCount } from "./EmergencyAlertProvider";

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({ session: { academy: { id: "7", name: "바래다" } } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
const mockPush = vi.fn();

let capturedOnEnvelope: ((envelope: WebSocketEnvelope) => void) | undefined;
vi.mock("@/shared/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks")>()),
  useRealtimeChannel: (_destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void) => {
    capturedOnEnvelope = onEnvelope;
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
