import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WebSocketEnvelope } from "@/shared/lib/ws";
import { ackEmergency, getEmergencies } from "../api";
import { EmergencyAlertProvider, useEmergencyUnackedCount } from "./EmergencyAlertProvider";

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({ session: { academy: { id: "7", name: "바래다" } } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
const mockPush = vi.fn();

let capturedOnEnvelope: ((envelope: WebSocketEnvelope) => void) | undefined;
vi.mock("@/shared/hooks", () => ({
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
