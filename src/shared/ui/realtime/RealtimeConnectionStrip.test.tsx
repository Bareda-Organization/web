import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WsConnectionState } from "../../lib/ws";
import { RealtimeConnectionStrip } from "./RealtimeConnectionStrip";

let mockConnectionState: WsConnectionState = "connected";
vi.mock("../../hooks", () => ({
  useRealtimeConnection: () => ({ connectionState: mockConnectionState }),
}));

// 비상·승인 화면처럼 연결 상태를 안 읽던 화면에서도 끊김이 보이게 레이아웃에 한 번만 둔다.
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

  it("재연결 대기 중이면 재연결 안내를 보인다", () => {
    mockConnectionState = "reconnecting";
    render(<RealtimeConnectionStrip />);

    expect(screen.getByText("재연결 시도 중")).toBeInTheDocument();
  });

  // 화면 확인에서 발견 — 비상 알림 띠는 좌우 24px 여백을 두는데 연결 띠만 가장자리까지 붙어 띠 두 개의 폭이 어긋났다.
  it("비상 알림 띠와 같은 좌우 24px 여백 안에 놓는다", () => {
    mockConnectionState = "reconnecting";
    render(<RealtimeConnectionStrip />);

    const wrapper = screen.getByText("재연결 시도 중").closest("[data-realtime-strip]");
    expect(wrapper).not.toBeNull();
    expect(getComputedStyle(wrapper as Element).paddingLeft).toBe("24px");
    expect(getComputedStyle(wrapper as Element).paddingRight).toBe("24px");
  });

  it("권한이 없으면 권한 없음 안내만 보인다 — 다시 해도 거절된다", () => {
    mockConnectionState = "forbidden";
    render(<RealtimeConnectionStrip />);

    expect(screen.getByText("실시간 조회 권한 없음")).toBeInTheDocument();
  });
});
