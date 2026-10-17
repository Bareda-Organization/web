import { envelope } from "@/shared/testing/wsEnvelope";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSocketEnvelope, WsConnectionState } from "../lib/ws";
import { useLiveRefresh } from "./useLiveRefresh";

// 실제 WebSocket 을 열지 않는다 — 훅이 넘긴 콜백을 붙잡고 연결 상태만 시험이 정한다.
let capturedOnEnvelope: (envelope: WebSocketEnvelope) => void = () => {};
let capturedOnReconnected: (() => void) | undefined;
let mockConnectionState: WsConnectionState = "disconnected";
vi.mock("./useRealtimeChannel", () => ({
  useRealtimeChannel: (_destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void, onReconnected?: () => void) => {
    capturedOnEnvelope = onEnvelope;
    capturedOnReconnected = onReconnected;
    return { connectionState: mockConnectionState };
  },
}));

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const setup = (overrides: Partial<Parameters<typeof useLiveRefresh>[0]> = {}) => {
  const refresh = vi.fn();
  const poll = vi.fn(async () => true);
  const onEnvelope = vi.fn();
  const utils = renderHook(() =>
    useLiveRefresh({ destination: "/topic/x", refreshScope: () => true, refresh, poll, onEnvelope, ...overrides }),
  );
  return { refresh, poll, onEnvelope, ...utils };
};

describe("useLiveRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockConnectionState = "disconnected";
    capturedOnReconnected = undefined;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["stop_arrived", "rider_changed", "run_started", "run_ended"] as const)("%s 방송은 300ms 뒤 refresh 를 한 번 부른다", async (event) => {
    const { refresh } = setup();

    act(() => capturedOnEnvelope(envelope(event, {})));
    await advance(299);
    expect(refresh).not.toHaveBeenCalled();
    await advance(1);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(true);
  });

  it("묶음 안에 전체 갱신 이벤트가 하나라도 있으면 refresh(true) 한 번이고, 타이머는 밀리지 않는다", async () => {
    const scopes = [false, true, false];
    const { refresh } = setup({ refreshScope: () => scopes.shift() ?? false });

    act(() => capturedOnEnvelope(envelope("stop_arrived", {})));
    await advance(200);
    act(() => capturedOnEnvelope(envelope("rider_changed", {})));
    await advance(100); // 첫 이벤트부터 300ms
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith(true);

    act(() => capturedOnEnvelope(envelope("stop_arrived", {})));
    await advance(300);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenLastCalledWith(false);
  });

  it("refreshScope 가 null 이면 갱신하지 않는다", async () => {
    const { refresh } = setup({ refreshScope: () => null });

    act(() => capturedOnEnvelope(envelope("run_started", {})));
    await advance(1000);

    expect(refresh).not.toHaveBeenCalled();
  });

  it("갱신 4종이 아닌 방송은 onEnvelope 로 넘기고 refresh 를 부르지 않는다", async () => {
    const { refresh, onEnvelope } = setup();
    const position = envelope("position", {});

    act(() => capturedOnEnvelope(position));
    await advance(1000);

    expect(onEnvelope).toHaveBeenCalledWith(position);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("연결이 끊겨 있으면 7초마다, 연결돼 있으면 30초마다 poll 한다", async () => {
    const disconnected = setup();
    await advance(7000);
    expect(disconnected.poll).toHaveBeenCalledTimes(1);
    disconnected.unmount();

    mockConnectionState = "connected";
    const connected = setup();
    await advance(7000);
    expect(connected.poll).not.toHaveBeenCalled();
    await advance(23000);
    expect(connected.poll).toHaveBeenCalledTimes(1);
  });

  it("pollEnabled 가 false 면 poll 하지 않는다", async () => {
    const { poll } = setup({ pollEnabled: false });

    await advance(60000);

    expect(poll).not.toHaveBeenCalled();
  });

  it("재연결 콜백을 그대로 채널에 넘기고, 안 넘기면 채널에도 없다", () => {
    const onReconnected = vi.fn();
    setup({ onReconnected });
    capturedOnReconnected?.();
    expect(onReconnected).toHaveBeenCalledTimes(1);

    setup();
    expect(capturedOnReconnected).toBeUndefined();
  });

  it("화면을 떠나면 예약해 둔 refresh 를 버린다", async () => {
    const { refresh, unmount } = setup();

    act(() => capturedOnEnvelope(envelope("run_ended", {})));
    unmount();
    await advance(1000);

    expect(refresh).not.toHaveBeenCalled();
  });

  it("cancelPendingRefresh 는 예약해 둔 refresh 를 버린다", async () => {
    const { refresh, result } = setup();

    act(() => capturedOnEnvelope(envelope("run_ended", {})));
    act(() => result.current.cancelPendingRefresh());
    await advance(1000);

    expect(refresh).not.toHaveBeenCalled();
  });
});
