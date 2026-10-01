import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseRealtimeChannelResult } from "./useRealtimeChannel";
import type { WebSocketEnvelope, WsConnectionState } from "../lib/ws";

// `useRealtimeChannel` 이 의존하는 `AcademyRealtimeClient`·`WS_BASE_URL` 을
// 통째로 가짜로 바꾼다 — 실제 WebSocket 을 열지 않고 참조 계수·구독 재걸기
// 로직만 검증한다. `shared` 모듈 변수(useRealtimeChannel.ts 안에 닫혀 있다)가
// 시험 사이에 새지 않도록 매 시험마다 `vi.resetModules()` 로 모듈을 새로 불러온다.
type FakeInstance = {
  connectCalls: number;
  disconnectCalls: number;
  subscribeCalls: Array<{ destination: string }>;
  unsubscribeCalls: number;
  state: WsConnectionState;
  emitState: (next: WsConnectionState) => void;
};

let instances: FakeInstance[] = [];

vi.mock("../lib/ws", () => {
  class FakeAcademyRealtimeClient {
    private listeners = new Set<() => void>();
    private instance: FakeInstance;

    constructor() {
      this.instance = {
        connectCalls: 0,
        disconnectCalls: 0,
        subscribeCalls: [],
        unsubscribeCalls: 0,
        state: "disconnected",
        emitState: (next) => {
          this.instance.state = next;
          for (const listener of this.listeners) listener();
        },
      };
      instances.push(this.instance);
    }

    connect(): void {
      this.instance.connectCalls += 1;
    }

    disconnect(): void {
      this.instance.disconnectCalls += 1;
    }

    getSnapshot(): WsConnectionState {
      return this.instance.state;
    }

    onConnectionStateChange(listener: () => void): () => void {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    // 두 번째 인자(`onEnvelope`)는 실제 구현의 호출 형태를 맞추기 위한 자리이지만
    // 이 가짜 구현은 구독 호출 사실만 기록하면 충분해 받지 않는다 — 초과 인자는
    // JS 호출 관례상 무시되므로 `useRealtimeChannel.ts` 쪽 호출부는 그대로 둔다.
    subscribe(destination: string): () => void {
      this.instance.subscribeCalls.push({ destination });
      return () => {
        this.instance.unsubscribeCalls += 1;
      };
    }
  }

  return {
    AcademyRealtimeClient: FakeAcademyRealtimeClient,
    WS_BASE_URL: "ws://fake",
  };
});

let useRealtimeChannel: (
  destination: string,
  onEnvelope: (envelope: WebSocketEnvelope) => void,
) => UseRealtimeChannelResult;

beforeEach(async () => {
  instances = [];
  vi.resetModules();
  ({ useRealtimeChannel } = await import("./useRealtimeChannel"));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useRealtimeChannel", () => {
  it("같은 화면 안에서 훅을 두 번 마운트해도(StrictMode 이중 마운트 흉내) 실제 연결은 한 번만 연다", () => {
    const { unmount: unmountA } = renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    const { unmount: unmountB } = renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));

    expect(instances).toHaveLength(1);
    expect(instances[0].connectCalls).toBe(1);

    unmountA();
    unmountB();
  });

  it("마지막 구독자가 언마운트해야 disconnect() 를 부른다", () => {
    const { unmount: unmountA } = renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    const { unmount: unmountB } = renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));

    unmountA();
    expect(instances[0].disconnectCalls).toBe(0);

    unmountB();
    expect(instances[0].disconnectCalls).toBe(1);
  });

  it("전부 해제된 뒤 다시 마운트하면 새 클라이언트를 만든다", () => {
    const first = renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    first.unmount();
    expect(instances).toHaveLength(1);

    renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    expect(instances).toHaveLength(2);
    expect(instances[1].connectCalls).toBe(1);
  });

  it("connected 상태가 아니면 subscribe 하지 않는다", () => {
    renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    expect(instances[0].subscribeCalls).toHaveLength(0);
  });

  it("connected 로 바뀌면 그 destination 을 구독한다", () => {
    renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    act(() => {
      instances[0].emitState("connected");
    });
    expect(instances[0].subscribeCalls).toEqual([{ destination: "/topic/admin/live" }]);
  });

  it("destination 이 바뀌면 옛 구독을 해제하고 새 destination 으로 다시 구독한다", () => {
    const { rerender } = renderHook(
      ({ destination }: { destination: string }) => useRealtimeChannel(destination, () => {}),
      { initialProps: { destination: "/topic/academy/1/live" } },
    );
    act(() => {
      instances[0].emitState("connected");
    });
    expect(instances[0].subscribeCalls).toEqual([{ destination: "/topic/academy/1/live" }]);

    rerender({ destination: "/topic/academy/2/live" });
    expect(instances[0].unsubscribeCalls).toBe(1);
    expect(instances[0].subscribeCalls).toEqual([
      { destination: "/topic/academy/1/live" },
      { destination: "/topic/academy/2/live" },
    ]);
  });

  it("F04-07: gaveUp 으로 굳은 연결은 reconnect() 로 다시 열 수 있다", () => {
    const { result } = renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    act(() => {
      instances[0].emitState("gaveUp");
    });
    expect(instances[0].connectCalls).toBe(1);

    act(() => {
      result.current.reconnect();
    });
    expect(instances[0].connectCalls).toBe(2);
  });

  it("F04-07: 브라우저가 다시 온라인이 되면 gaveUp 연결을 저절로 다시 연다(연결 중이던 상태는 건드리지 않는다)", () => {
    renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(instances[0].connectCalls).toBe(1);

    act(() => {
      instances[0].emitState("gaveUp");
    });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(instances[0].connectCalls).toBe(2);
  });

  // R46-FIXRT S-5 — 기본 재연결 정책은 포기하지 않아 끊긴 연결은 계속 `reconnecting` 이다. 브라우저가 다시 온라인이
  // 되거나 탭이 다시 보일 때 다음 타이머(최대 30초)를 기다리지 않고 바로 다시 붙는다.
  it("브라우저가 다시 온라인이 되면 재연결 대기 중인 연결을 바로 다시 붙인다", () => {
    renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    act(() => {
      instances[0].emitState("reconnecting");
    });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(instances[0].connectCalls).toBe(2);
  });

  it("탭이 다시 보이면 재연결 대기 중인 연결을 바로 다시 붙이고, 연결된 연결은 건드리지 않는다", () => {
    renderHook(() => useRealtimeChannel("/topic/admin/live", () => {}));
    act(() => {
      instances[0].emitState("connected");
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(instances[0].connectCalls).toBe(1);

    act(() => {
      instances[0].emitState("reconnecting");
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(instances[0].connectCalls).toBe(2);
  });
});
