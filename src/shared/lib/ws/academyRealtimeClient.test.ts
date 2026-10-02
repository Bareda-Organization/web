import { describe, expect, it, vi } from "vitest";
import { AcademyRealtimeClient } from "./academyRealtimeClient";
import { WsBackoffPolicy } from "./wsBackoffPolicy";
import { ApiError, NetworkError } from "../http/apiError";
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
        return {
          unsubscribe: () => {
            // @stomp/stompjs 7.x — 연결이 없으면 구독 해제가 던진다(`_checkConnection`).
            if (!handle.connected) throw new TypeError("There is no underlying STOMP connection");
            callbacksByDestination.delete(destination);
          },
        };
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
      const policy = new WsBackoffPolicy({ initialDelayMs: 100, multiplier: 2, maxDelayMs: 1000, maxAttempts: 6, jitterRatio: 0 });
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

  // R46-FIXRT S-5 — 상한을 주지 않은 기본 정책은 서버가 오래 꺼져 있어도 포기하지 않는다.
  it("상한이 없는 정책은 7번째 이후에도 계속 재연결을 시도하고 gaveUp 이 되지 않는다", () => {
    vi.useFakeTimers();
    try {
      const { factory, handles } = createFakeClientFactory();
      const client = new AcademyRealtimeClient({
        url: "ws://x",
        createClient: factory,
        readAccessToken: () => null,
        backoffPolicy: new WsBackoffPolicy({ initialDelayMs: 10, multiplier: 1, maxDelayMs: 10, jitterRatio: 0 }),
      });
      client.connect();
      for (let i = 0; i < 20; i += 1) {
        handles[handles.length - 1].config.onWebSocketClose({});
        expect(client.getSnapshot()).toBe("reconnecting");
        vi.advanceTimersByTime(10);
      }
      // 옛 기본값(6회 뒤 포기)이면 최초 1 + 재시도 6 = 7개에서 멈춘다.
      expect(handles).toHaveLength(21);
    } finally {
      vi.useRealTimers();
    }
  });

  it("재연결 대기에는 지터가 붙는다 — 한꺼번에 끊긴 탭이 같은 순간에 붙지 않게", () => {
    vi.useFakeTimers();
    try {
      const { factory, handles } = createFakeClientFactory();
      const client = new AcademyRealtimeClient({
        url: "ws://x",
        createClient: factory,
        readAccessToken: () => null,
        backoffPolicy: new WsBackoffPolicy({ initialDelayMs: 1000, maxDelayMs: 30000 }),
        random: () => 1, // 가장 많이 줄어든 쪽 — 1000ms × 0.7 = 700ms
      });
      client.connect();
      handles[0].config.onWebSocketClose({});

      vi.advanceTimersByTime(699);
      expect(handles).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(handles).toHaveLength(2);
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

  it("W2: TOKEN_EXPIRED STOMP 오류를 받으면 재발급을 부르고, 성공하면 새 토큰으로 재연결한다", async () => {
    const { factory, handles } = createFakeClientFactory();
    const refreshAccessToken = vi.fn().mockResolvedValue("new-token");
    const client = new AcademyRealtimeClient({
      url: "ws://x",
      createClient: factory,
      readAccessToken: () => "old-token",
      refreshAccessToken,
    });
    client.connect();
    handles[0].connected = true;
    handles[0].config.onConnect({ headers: {}, body: "" });

    handles[0].config.onStompError({ headers: { message: "TOKEN_EXPIRED" }, body: "" });
    handles[0].config.onWebSocketClose({});
    // 재발급이 끝날 때까지 재연결이 걸리지 않는다 — 마이크로태스크 큐를 비운다.
    await Promise.resolve();
    await Promise.resolve();

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(handles).toHaveLength(2);
    expect(handles[1].config.connectHeaders).toEqual({ Authorization: "Bearer new-token" });
  });

  it("W2: TOKEN_EXPIRED 뒤 재발급이 401 로 거절되면 재연결하지 않고 로그인 만료를 알린다", async () => {
    const { factory, handles } = createFakeClientFactory();
    const refreshAccessToken = vi.fn().mockRejectedValue(new ApiError(401, "TOKEN_EXPIRED", "refresh 토큰 무효"));
    const onSessionExpired = vi.fn();
    const client = new AcademyRealtimeClient({
      url: "ws://x",
      createClient: factory,
      readAccessToken: () => "old-token",
      refreshAccessToken,
      onSessionExpired,
    });
    client.connect();
    handles[0].connected = true;
    handles[0].config.onConnect({ headers: {}, body: "" });

    handles[0].config.onStompError({ headers: { message: "TOKEN_EXPIRED" }, body: "" });
    handles[0].config.onWebSocketClose({});
    await Promise.resolve();
    await Promise.resolve();

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(handles).toHaveLength(1);
    expect(client.getSnapshot()).toBe("disconnected");
  });

  it("onWebSocketError 와 onWebSocketClose 가 같은 시도에 대해 둘 다 와도 재연결은 한 번만 걸린다 (disconnectHandled 가드)", () => {
    vi.useFakeTimers();
    try {
      const { factory, handles } = createFakeClientFactory();
      const policy = new WsBackoffPolicy({ initialDelayMs: 100, multiplier: 2, maxDelayMs: 1000, maxAttempts: 6, jitterRatio: 0 });
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

  it("F04-01: 소켓이 끊긴 뒤에 구독 해제 함수를 불러도 던지지 않는다", () => {
    const { factory, handles } = createFakeClientFactory();
    const client = new AcademyRealtimeClient({ url: "ws://x", createClient: factory, readAccessToken: () => null });
    client.connect();
    handles[0].connected = true;
    handles[0].config.onConnect({ headers: {}, body: "" });
    const unsubscribe = client.subscribe("/topic/admin/live", () => {});

    // 서버 재기동·Wi-Fi 끊김 — stompjs 는 연결 표시를 먼저 내린 뒤 소켓 종료 콜백을 부른다.
    handles[0].connected = false;
    handles[0].config.onWebSocketClose({});

    expect(() => unsubscribe()).not.toThrow();
  });

  it("F04-03: 재발급을 기다리는 사이 disconnect() 가 불리면 재발급이 끝나도 새 소켓을 열지 않는다", async () => {
    const { factory, handles } = createFakeClientFactory();
    let resolveRefresh: (token: string) => void = () => {};
    const refreshAccessToken = vi.fn(() => new Promise<string>((resolve) => (resolveRefresh = resolve)));
    const client = new AcademyRealtimeClient({
      url: "ws://x",
      createClient: factory,
      readAccessToken: () => "old-token",
      refreshAccessToken,
    });
    client.connect();
    handles[0].config.onStompError({ headers: { message: "TOKEN_EXPIRED" }, body: "" });
    handles[0].config.onWebSocketClose({});

    client.disconnect();
    resolveRefresh("new-token");
    await Promise.resolve();
    await Promise.resolve();

    expect(handles).toHaveLength(1);
    expect(client.getSnapshot()).toBe("disconnected");
  });

  it("F04-02: TOKEN_EXPIRED 뒤 재발급이 네트워크 오류로 실패하면 로그인 만료로 알리지 않고 일반 재연결 경로로 넘긴다", async () => {
    vi.useFakeTimers();
    try {
      const { factory, handles } = createFakeClientFactory();
      const refreshAccessToken = vi.fn().mockRejectedValue(new NetworkError(new TypeError("Failed to fetch")));
      const onSessionExpired = vi.fn();
      const client = new AcademyRealtimeClient({
        url: "ws://x",
        createClient: factory,
        readAccessToken: () => "old-token",
        refreshAccessToken,
        onSessionExpired,
      });
      client.connect();
      handles[0].config.onStompError({ headers: { message: "TOKEN_EXPIRED" }, body: "" });
      handles[0].config.onWebSocketClose({});
      await vi.advanceTimersByTimeAsync(0);

      expect(onSessionExpired).not.toHaveBeenCalled();
      expect(client.getSnapshot()).toBe("reconnecting");
      await vi.advanceTimersByTimeAsync(2000);
      expect(handles.length).toBeGreaterThan(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("F04-09: 다른 학원 채널 구독 거부(ACADEMY_SCOPE_VIOLATION)도 forbidden 으로 멈춘다", () => {
    const { factory, handles } = createFakeClientFactory();
    const client = new AcademyRealtimeClient({ url: "ws://x", createClient: factory, readAccessToken: () => null });
    client.connect();

    handles[0].config.onStompError({ headers: { message: "ACADEMY_SCOPE_VIOLATION" }, body: "" });
    handles[0].config.onWebSocketClose({});

    expect(client.getSnapshot()).toBe("forbidden");
    expect(handles).toHaveLength(1);
  });

  // R47 R-1 — `connect()` 가 이미 연결됐거나 연결 중인 클라이언트를 닫지 않고 새로 만들어 덮으면, 덮인 쪽이 하트비트를 계속 보내는 고아가 된다.
  it("R-1: 연결됐거나 연결 중인 클라이언트에 connect() 를 다시 불러도 새 클라이언트를 만들지 않는다 (Dart 와 같은 가드)", () => {
    const { factory, handles } = createFakeClientFactory();
    const client = new AcademyRealtimeClient({ url: "ws://x", createClient: factory, readAccessToken: () => null });

    client.connect();
    client.connect();
    expect(handles).toHaveLength(1);
    expect(client.getSnapshot()).toBe("connecting");

    handles[0].connected = true;
    handles[0].config.onConnect({ headers: {}, body: "" });
    client.connect();
    expect(handles).toHaveLength(1);
    expect(handles[0].deactivateCalls).toBe(0);
    expect(client.getSnapshot()).toBe("connected");
  });

  it("R-1: TOKEN_EXPIRED 재발급을 기다리는 사이(reconnecting) connect() 가 만든 연결은, 재발급 뒤 새 연결이 열릴 때 닫힌다", async () => {
    const { factory, handles } = createFakeClientFactory();
    let resolveRefresh: (token: string) => void = () => {};
    const refreshAccessToken = vi.fn(() => new Promise<string>((resolve) => (resolveRefresh = resolve)));
    const client = new AcademyRealtimeClient({
      url: "ws://x",
      createClient: factory,
      readAccessToken: () => "old-token",
      refreshAccessToken,
    });
    client.connect();
    handles[0].config.onStompError({ headers: { message: "TOKEN_EXPIRED" }, body: "" });
    handles[0].config.onWebSocketClose({});
    expect(client.getSnapshot()).toBe("reconnecting");

    // 탭이 다시 보이거나 온라인이 되면 `reopenIfStalled` 가 reconnecting 에서 `connect()` 를 부른다.
    client.connect();
    expect(handles).toHaveLength(2);

    resolveRefresh("new-token");
    await Promise.resolve();
    await Promise.resolve();

    expect(handles).toHaveLength(3);
    expect(handles[1].deactivateCalls).toBe(1);
    expect(handles[2].deactivateCalls).toBe(0);
  });

  it("R-1: gaveUp·forbidden 에서 connect() 를 다시 부르면 새 클라이언트로 재시작한다", () => {
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

      client.connect();
      expect(handles).toHaveLength(2);
      expect(client.getSnapshot()).toBe("connecting");

      handles[1].config.onStompError({ headers: { message: "FORBIDDEN" }, body: "" });
      handles[1].config.onWebSocketClose({});
      expect(client.getSnapshot()).toBe("forbidden");

      client.connect();
      expect(handles).toHaveLength(3);
      expect(client.getSnapshot()).toBe("connecting");
    } finally {
      vi.useRealTimers();
    }
  });
});
