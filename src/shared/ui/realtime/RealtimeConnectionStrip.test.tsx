import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WsConnectionState } from "../../lib/ws";
import { RealtimeConnectionStrip } from "./RealtimeConnectionStrip";

let mockConnectionState: WsConnectionState = "connected";
const mockReconnect = vi.fn();
vi.mock("../../hooks", () => ({
  useRealtimeConnection: () => ({ connectionState: mockConnectionState, reconnect: mockReconnect }),
}));

// R46-FIXCONN C-12 — 비상·승인 화면처럼 연결 상태를 안 읽던 화면에서도 끊김이 보이게 레이아웃에 한 번만 둔다.
describe("RealtimeConnectionStrip", () => {
  afterEach(() => {
    mockConnectionState = "connected";
    vi.clearAllMocks();
  });

  it("연결돼 있으면 아무것도 그리지 않는다", () => {
    const { container } = render(<RealtimeConnectionStrip />);
    expect(container).toBeEmptyDOMElement();
  });

  it("연결 시도 중·직접 끊음 상태에서도 그리지 않는다 — 처음 열 때 깜빡이지 않는다", () => {
    mockConnectionState = "connecting";
    const { container, rerender } = render(<RealtimeConnectionStrip />);
    expect(container).toBeEmptyDOMElement();
    mockConnectionState = "disconnected";
    rerender(<RealtimeConnectionStrip />);
    expect(container).toBeEmptyDOMElement();
  });

  it("재연결 대기 중이면 재연결 안내를 보인다(다시 연결 버튼은 없다)", () => {
    mockConnectionState = "reconnecting";
    render(<RealtimeConnectionStrip />);

    expect(screen.getByText("재연결 시도 중입니다")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 연결" })).not.toBeInTheDocument();
  });

  it("재연결을 포기했으면 끊김 안내와 [다시 연결] 을 보이고, 누르면 다시 연다", () => {
    mockConnectionState = "gaveUp";
    render(<RealtimeConnectionStrip />);

    expect(screen.getByText("실시간 연결 끊김")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 연결" }));
    expect(mockReconnect).toHaveBeenCalledTimes(1);
  });

  it("권한이 없으면 권한 없음 안내만 보이고 [다시 연결] 은 없다 — 다시 해도 거절된다", () => {
    mockConnectionState = "forbidden";
    render(<RealtimeConnectionStrip />);

    expect(screen.getByText("실시간 조회 권한 없음")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 연결" })).not.toBeInTheDocument();
  });
});
