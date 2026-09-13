import { describe, expect, it, vi } from "vitest";
import { AcademyRealtimeClient } from "./academyRealtimeClient";
import { WsBackoffPolicy } from "./wsBackoffPolicy";
import type { StompClientConfig, StompClientLike, StompMessageLike } from "./stompClient";

// 실제 WebSocket 없이 `AcademyRealtimeClient` 의 재연결·FORBIDDEN 처리를
// 검증하기 위한 가짜 STOMP 클라이언트 — `stompClient.ts` 상단 주석이 설명하는
// 어댑터 경계를 그대로 이용한다. 시험 쪽에서 config 의 콜백을 직접 호출해
// "서버가 이런 프레임을 보냈다" 를 흉내 낸다.
type FakeClientHandle = {
  config: StompClientConfig;
  activateCalls: number;
  deactivateCalls: number;
  connected: boolean;
  subscribedDestinations: string[];
  emit: (destination: string, body: unknown) => void;
};

const createFakeClientFactory = () => {
  const handles: FakeClientHandle[] = [];
  const factory = (config: StompClientConfig): StompClientLike => {
    const handle: FakeClientHandle = {
      config,
      activateCalls: 0,
      deactivateCalls: 0,
      connected: false,
      subscribedDestinations: [],
      emit: () => {},
    };
    const callbacksByDestination = new Map<string, (message: StompMessageLike) => void>();
    handle.emit = (destination, body) => {
      const callback = callbacksByDestination.get(destination);
      if (callback === undefined) throw new Error(`구독하지 않은 목적지로 emit: ${destination}`);
      callback({ body: JSON.stringify(body) });
    };
    const client: StompClientLike = {
      activate: () => {
        handle.activateCalls += 1;
      },
      deactivate: () => {
        handle.deactivateCalls += 1;
        handle.connected = false;
        return Promise.resolve();
      },
      subscribe: (destination, callback) => {
        handle.subscribedDestinations.push(destination);
        callbacksByDestination.set(destination, callback);
        return { unsubscribe: () => callbacksByDestination.delete(destination) };
      },
      get connected() {
        return handle.connected;
      },
    };
    handles.push(handle);
    return client;
  };
  return { factory, handles };
};

describe("AcademyRealtimeClient", () => {
  it("connect() 는 STOMP 클라이언트를 만들어 activate 하고, onConnect 가 오면 connected 상태가 된다", () => {
    const { factory, handles } = createFakeClientFactory();
    const client = new AcademyRealtimeClient({ url: "ws://x", createClient: factory, readAccessToken: () => null });

    client.connect();
    expect(handles).toHaveLength(1);
    expect(handles[0].activateCalls).toBe(1);
    expect(client.getSnapshot()).toBe("connecting");

    handles[0].connected = true;
    handles[0].config.onConnect({ headers: {}, body: "" });
    expect(client.getSnapshot()).toBe("connected");
  });

  it("토큰이 있으면 Authorization 헤더를 싣고, 없으면 헤더 자체를 안 싣는다", () => {
    const { factory, handles } = createFakeClientFactory();
    const withToken = new AcademyRealtimeClient({
      url: "ws://x",
      createClient: factory,
      readAccessToken: () => "abc",
    });
    withToken.connect();
    expect(handles[0].config.connectHeaders).toEqual({ Authorization: "Bearer abc" });

    const withoutToken = new AcademyRealtimeClient({
      url: "ws://x",
      createClient: factory,
      readAccessToken: () => null,
    });
    withoutToken.connect();
    expect(handles[1].config.connectHeaders).toEqual({});
  });

  it("subscribe() 로 받은 프레임을 WebSocketEnvelope 로 파싱해 넘긴다", () => {
    const { factory, handles } = createFakeClientFactory();
    const client = new AcademyRealtimeClient({ url: "ws://x", createClient: factory, readAccessToken: () => null });
    client.connect();
    handles[0].connected = true;
    handles[0].config.onConnect({ headers: {}, body: "" });

    const onEnvelope = vi.fn();
    client.subscribe("/topic/academy/1/live", onEnvelope);
    handles[0].emit("/topic/academy/1/live", {
      event: "position",
      run_id: 7,
      occurred_at: "t",
      payload: { lat: 1 },
    });

    expect(onEnvelope).toHaveBeenCalledTimes(1);
    expect(onEnvelope.mock.calls[0][0]).toMatchObject({ event: "position", runId: "7" });
  });

  it("connected 상태가 아닐 때 subscribe() 를 부르면 던진다", () => {
    const { factory } = createFakeClientFactory();
    const client = new AcademyRealtimeClient({ url: "ws://x", createClient: factory, readAccessToken: () => null });
    expect(() => client.subscribe("/topic/admin/live", () => {})).toThrow();
  });

  it("FORBIDDEN STOMP 오류를 받으면 forbidden 상태로 전이하고, 뒤이은 소켓 종료에도 재연결을 걸지 않는다", () => {
    const { factory, handles } = createFakeClientFactory();
    const client = new AcademyRealtimeClient({ url: "ws://x", createClient: factory, readAccessToken: () => null });
    client.connect();
    handles[0].connected = true;
    handles[0].config.onConnect({ headers: {}, body: "" });

    handles[0].config.onStompError({ headers: { message: "FORBIDDEN" }, body: "" });
    expect(client.getSnapshot()).toBe("forbidden");

    handles[0].config.onWebSocketClose({});
    expect(client.getSnapshot()).toBe("forbidden");
    // 재연결이 걸렸으면 새 클라이언트(handles[1])가 생겼을 것이다.
    expect(handles).toHaveLength(1);
  });

  it("일반적인 끊김은 WsBackoffPolicy 지연만큼 기다렸다가 재연결한다", () => {
    vi.useFakeTimers();
    try {
      const { factory, handles } = createFakeClientFactory();
      const policy = new WsBackoffPolicy({ initialDelayMs: 100, multiplier: 2, maxDelayMs: 1000, maxAttempts: 6 });
      const client = new AcademyRealtimeClient({
        url: "ws://x",
        createClient: factory,
        readAccessToken: () => null,
        backoffPolicy: policy,
      });
      client.connect();
      handles[0].connected = true;
      handles[0].config.onConnect({ headers: {}, body: "" });

      handles[0].config.onWebSocketClose({});
      expect(client.getSnapshot()).toBe("reconnecting");
      expect(handles).toHaveLength(1);

      vi.advanceTimersByTime(99);
      expect(handles).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(handles).toHaveLength(2);
      expect(handles[1].activateCalls).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shouldGiveUp 조건에 도달하면 gaveUp 상태로 멈춘다", () => {
    vi.useFakeTimers();
    try {
      const { factory, handles } = createFakeClientFactory();
      const policy = new WsBackoffPolicy({ initialDelayMs: 10, multiplier: 1, maxDelayMs: 10, maxAttempts: 0 });
      const client = new AcademyRealtimeClient({
        url: "ws://x",
        createClient: factory,
        readAccessToken: () => null,
        backoffPolicy: policy,
      });
      client.connect();
      handles[0].config.onWebSocketClose({});
      expect(client.getSnapshot()).toBe("gaveUp");
      vi.advanceTimersByTime(1000);
      expect(handles).toHaveLength(1); // 재연결 시도가 걸리지 않았다.
    } finally {
      vi.useRealTimers();
    }
  });

  it("disconnect() 를 부르면 disconnected 상태가 되고 재연결하지 않는다", () => {
    vi.useFakeTimers();
    try {
      const { factory, handles } = createFakeClientFactory();
      const client = new AcademyRealtimeClient({ url: "ws://x", createClient: factory, readAccessToken: () => null });
      client.connect();
      handles[0].connected = true;
      handles[0].config.onConnect({ headers: {}, body: "" });

      client.disconnect();
      expect(client.getSnapshot()).toBe("disconnected");
      expect(handles[0].deactivateCalls).toBe(1);

      // deactivate() 는 콜백을 직접 부르지 않지만, 혹시 서버 쪽에서 뒤늦게
      // close 이벤트가 와도 manuallyDisconnected 가드가 재연결을 막아야 한다.
      handles[0].config.onWebSocketClose({});
      vi.advanceTimersByTime(60000);
      expect(handles).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("onWebSocketError 와 onWebSocketClose 가 같은 시도에 대해 둘 다 와도 재연결은 한 번만 걸린다 (disconnectHandled 가드)", () => {
    vi.useFakeTimers();
    try {
      const { factory, handles } = createFakeClientFactory();
      const policy = new WsBackoffPolicy({ initialDelayMs: 100, multiplier: 2, maxDelayMs: 1000, maxAttempts: 6 });
      const client = new AcademyRealtimeClient({
        url: "ws://x",
        createClient: factory,
        readAccessToken: () => null,
        backoffPolicy: policy,
      });
      client.connect();

      handles[0].config.onWebSocketError(new Error("boom"));
      handles[0].config.onWebSocketClose({});

      vi.advanceTimersByTime(100);
      // 가드가 없었다면 재연결이 두 번 걸려 handles 가 3개(원본 + 2회 재연결)가 됐을 것이다.
      expect(handles).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
