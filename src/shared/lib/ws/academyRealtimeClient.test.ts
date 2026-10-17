import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AcademyRealtimeClient } from "./academyRealtimeClient";
import { ApiError, NetworkError } from "../http/apiError";
import type { StompClientConfig, StompClientLike, StompMessageLike } from "./stompClient";

// 실제 WebSocket 없이 `AcademyRealtimeClient` 를 검증하는 가짜 STOMP 클라이언트 — `stompClient.ts` 의 어댑터 경계를 이용한다.
// 실제 stompjs 는 클라이언트 하나가 접속 시도마다 `beforeConnect`(= `config.getConnectHeaders`)를 부르고 소켓이 닫히면 스스로
// 다시 예약한다. 가짜는 그 시도를 `attempt()` 로 흉내 내고(헤더를 돌려준다), 콜백은 시험이 직접 불러 서버의 프레임·종료를 흉내 낸다.
type FakeHandle = {
  config: StompClientConfig;
  activateCalls: number;
  deactivateCalls: number;
  connected: boolean;
  subscribedDestinations: string[];
  unsubscribeCalls: number;
  attempt: () => Promise<Record<string, string>>;
  open: () => void;
  emit: (destination: string, body: unknown) => void;
};

const createFakeClientFactory = () => {
  const handles: FakeHandle[] = [];
  const factory = (config: StompClientConfig): StompClientLike => {
    const callbacksByDestination = new Map<string, (message: StompMessageLike) => void>();
    const handle: FakeHandle = {
      config,
      activateCalls: 0,
      deactivateCalls: 0,
      connected: false,
      subscribedDestinations: [],
      unsubscribeCalls: 0,
      attempt: () => config.getConnectHeaders(),
      open: () => {
        handle.connected = true;
        config.onConnect({ headers: {}, body: "" });
      },
      emit: (destination, body) => {
        const callback = callbacksByDestination.get(destination);
        if (callback === undefined) throw new Error(`구독하지 않은 목적지로 emit: ${destination}`);
        callback({ body: JSON.stringify(body) });
      },
    };
    handles.push(handle);
    return {
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
            handle.unsubscribeCalls += 1;
            callbacksByDestination.delete(destination);
          },
        };
      },
      get connected() {
        return handle.connected;
      },
    };
  };
  return { factory, handles };
};

// 서버가 소켓을 닫았다 — `onWebSocketClose` 가 불리고, 직접 끊지 않았다면 stompjs 가 다음 접속을 예약한다.
const serverCloses = (handle: FakeHandle, code?: number) => {
  handle.connected = false;
  handle.config.onWebSocketClose({ code });
};
const serverError = (handle: FakeHandle, message: string) => handle.config.onStompError({ headers: { message }, body: "" });

type SetupOptions = { refreshAccessToken?: () => Promise<string>; token?: string | null };

const setup = (options: SetupOptions = {}) => {
  const { factory, handles } = createFakeClientFactory();
  let storedToken: string | null = options.token === undefined ? "old-token" : options.token;
  const onSessionExpired = vi.fn();
  const onDebugMessage = vi.fn();
  // 실제 재발급은 새 토큰을 저장소에 넣고 돌려준다 — 접속 시도가 그 저장소를 읽는다.
  const refreshAccessToken = vi.fn(
    options.refreshAccessToken ??
      (async () => {
        storedToken = "new-token";
        return "new-token";
      }),
  );
  const client = new AcademyRealtimeClient({
    url: "ws://x",
    createClient: factory,
    readAccessToken: () => storedToken,
    refreshAccessToken,
    onSessionExpired,
    onDebugMessage,
  });
  const connected = () => {
    client.connect();
    handles[0].open();
    return handles[0];
  };
  return {
    client,
    handles,
    refreshAccessToken,
    onSessionExpired,
    onDebugMessage,
    connected,
    setToken: (token: string | null) => {
      storedToken = token;
    },
  };
};

describe("AcademyRealtimeClient", () => {
  it("connect() 는 STOMP 클라이언트를 하나 만들어 activate 하고, onConnect 가 오면 connected 상태가 된다", () => {
    const { client, handles } = setup();

    client.connect();
    expect(handles).toHaveLength(1);
    expect(handles[0].activateCalls).toBe(1);
    expect(client.getSnapshot()).toBe("connecting");

    handles[0].open();
    expect(client.getSnapshot()).toBe("connected");
  });

  // 접속 시도마다 토큰을 새로 읽는다 — 첫 토큰을 붙잡아 두면 REST 401 로 갱신된 토큰이 재접속에 반영되지 않는다.
  it("접속 시도마다 저장소의 최신 토큰을 읽어 Authorization 헤더에 싣고, 토큰이 없으면 헤더를 싣지 않는다", async () => {
    const { client, handles, setToken } = setup({ token: "token-1" });
    client.connect();

    expect(await handles[0].attempt()).toEqual({ Authorization: "Bearer token-1" });
    setToken("token-2");
    expect(await handles[0].attempt()).toEqual({ Authorization: "Bearer token-2" });
    setToken(null);
    expect(await handles[0].attempt()).toEqual({});
  });

  it("subscribe() 로 받은 프레임을 WebSocketEnvelope 로 파싱해 넘긴다", () => {
    const { client, connected } = setup();
    const handle = connected();

    const onEnvelope = vi.fn();
    client.subscribe("/topic/academy/1/live", onEnvelope);
    handle.emit("/topic/academy/1/live", { event: "position", run_id: 7, occurred_at: "t", payload: { lat: 1 } });

    expect(onEnvelope).toHaveBeenCalledTimes(1);
    expect(onEnvelope.mock.calls[0][0]).toMatchObject({ event: "position", runId: "7" });
  });

  it("connected 상태가 아닐 때 subscribe() 를 부르면 던진다", () => {
    const { client } = setup();
    expect(() => client.subscribe("/topic/admin/live", () => {})).toThrow();
  });

  it("소켓이 닫힌 뒤에 구독 해제 함수를 불러도 던지지 않는다", () => {
    const { client, connected } = setup();
    const handle = connected();
    const unsubscribe = client.subscribe("/topic/admin/live", () => {});

    serverCloses(handle, 1006);
    expect(() => unsubscribe()).not.toThrow();
  });

  describe("끊김 — stompjs 내장 재접속", () => {
    it("일반적인 끊김은 reconnecting 이 되고 같은 클라이언트가 다시 붙는다 — 새 클라이언트도, 직접 deactivate 도 없다", () => {
      const { client, handles, connected } = setup();
      const handle = connected();

      serverCloses(handle, 1006);

      expect(client.getSnapshot()).toBe("reconnecting");
      expect(handles).toHaveLength(1);
      expect(handle.deactivateCalls).toBe(0);

      handle.open();
      expect(client.getSnapshot()).toBe("connected");
    });

    it("첫 접속이 실패해도 reconnecting 이 되고, 몇 번을 실패해도 포기하지 않는다", () => {
      const { client, handles } = setup();
      client.connect();

      for (let i = 0; i < 10; i += 1) {
        serverCloses(handles[0], 1006);
        expect(client.getSnapshot()).toBe("reconnecting");
      }
      expect(handles[0].deactivateCalls).toBe(0);
    });

    it("종료 코드 4500 · 1008 은 멈추지 않고 재접속하며 재발급도 세션 만료도 일으키지 않는다", () => {
      const { client, connected, refreshAccessToken, onSessionExpired } = setup();
      const handle = connected();

      serverCloses(handle, 4500);
      expect(client.getSnapshot()).toBe("reconnecting");
      handle.open();
      serverCloses(handle, 1008);
      expect(client.getSnapshot()).toBe("reconnecting");
      expect(handle.deactivateCalls).toBe(0);
      expect(refreshAccessToken).not.toHaveBeenCalled();
      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it("disconnect() 를 부르면 disconnected 가 되고 연결을 닫는다", () => {
      const { client, connected } = setup();
      const handle = connected();

      client.disconnect();

      expect(client.getSnapshot()).toBe("disconnected");
      expect(handle.deactivateCalls).toBe(1);
    });

    it("연결 중이거나 연결된 클라이언트에 connect() 를 다시 불러도 아무 일도 없다", () => {
      const { client, handles } = setup();
      client.connect();
      client.connect();
      expect(handles).toHaveLength(1);
      expect(handles[0].activateCalls).toBe(1);

      handles[0].open();
      client.connect();
      expect(handles[0].activateCalls).toBe(1);
    });

    it("재접속 대기 중(reconnecting)에 connect() 를 부르면 대기를 끊고 같은 클라이언트로 지금 다시 붙는다", () => {
      const { client, handles, connected } = setup();
      const handle = connected();
      serverCloses(handle, 1006);

      client.connect();

      expect(handles).toHaveLength(1);
      expect(handle.deactivateCalls).toBe(1);
      expect(handle.activateCalls).toBe(2);
      expect(client.getSnapshot()).toBe("connecting");
    });
  });

  describe("구독 거부 — forbidden", () => {
    it("FORBIDDEN STOMP 오류를 받으면 forbidden 이 되고, 뒤이은 소켓 종료에 재접속을 막는다", () => {
      const { client, connected } = setup();
      const handle = connected();

      serverError(handle, "FORBIDDEN");
      expect(client.getSnapshot()).toBe("forbidden");
      serverCloses(handle, 1000);

      expect(client.getSnapshot()).toBe("forbidden");
      expect(handle.deactivateCalls).toBe(1);
    });

    it("다른 학원 채널 구독 거부(ACADEMY_SCOPE_VIOLATION)도 forbidden 으로 멈춘다", () => {
      const { client, connected } = setup();
      const handle = connected();
      serverError(handle, "ACADEMY_SCOPE_VIOLATION");
      serverCloses(handle);
      expect(client.getSnapshot()).toBe("forbidden");
    });

    it("종료 코드 4403 은 ERROR 프레임이 없어도 forbidden 으로 멈춘다", () => {
      const { client, connected } = setup();
      const handle = connected();
      serverCloses(handle, 4403);
      expect(client.getSnapshot()).toBe("forbidden");
      expect(handle.deactivateCalls).toBe(1);
    });

    it("forbidden 에서 connect() 를 다시 부르면 같은 클라이언트로 다시 시작한다", () => {
      const { client, handles, connected } = setup();
      const handle = connected();
      serverCloses(handle, 4403);

      client.connect();

      expect(handles).toHaveLength(1);
      expect(handle.activateCalls).toBe(2);
      expect(client.getSnapshot()).toBe("connecting");
    });
  });

  // 끊긴 원인이 토큰이면 소켓이 닫힌 직후 재발급을 시작하고, 다음 접속 시도는 그 재발급이 끝난 뒤 새 토큰으로 나간다.
  describe("TOKEN_EXPIRED · UNAUTHORIZED — 재발급 뒤 재접속", () => {
    it("TOKEN_EXPIRED 는 소켓이 닫힌 뒤 재발급을 한 번 부르고, 다음 접속 시도는 재발급이 끝나기를 기다렸다가 새 토큰을 싣는다", async () => {
      let finishRefresh: (token: string) => void = () => {};
      const { client, connected, refreshAccessToken, setToken, onSessionExpired } = setup({
        refreshAccessToken: () => new Promise<string>((resolve) => (finishRefresh = resolve)),
      });
      const handle = connected();

      serverError(handle, "TOKEN_EXPIRED");
      expect(refreshAccessToken).not.toHaveBeenCalled();
      serverCloses(handle);
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(client.getSnapshot()).toBe("reconnecting");

      let headers: Record<string, string> | undefined;
      void handle.attempt().then((value) => (headers = value));
      await Promise.resolve();
      expect(headers).toBeUndefined();

      setToken("new-token");
      finishRefresh("new-token");
      await vi.waitFor(() => expect(headers).toEqual({ Authorization: "Bearer new-token" }));
      expect(onSessionExpired).not.toHaveBeenCalled();
    });

    it("TOKEN_EXPIRED 뒤 재발급이 401 로 거절되면 세션 만료를 알리고 연결을 닫아 다시 붙지 않는다", async () => {
      const { client, connected, onSessionExpired } = setup({
        refreshAccessToken: () => Promise.reject(new ApiError(401, "UNAUTHORIZED", "만료")),
      });
      const handle = connected();

      serverError(handle, "TOKEN_EXPIRED");
      serverCloses(handle);
      await vi.waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));

      expect(client.getSnapshot()).toBe("disconnected");
      expect(handle.deactivateCalls).toBe(1);
    });

    // Ruling 905 — 망 오류 · 5xx 는 일시적일 수 있으니 세션을 끝내지 않는다.
    it.each([
      ["망 오류", () => new NetworkError(new TypeError("Failed to fetch"))],
      ["5xx", () => new ApiError(503, "SERVICE_UNAVAILABLE", "점검")],
    ])("TOKEN_EXPIRED 뒤 재발급이 %s 로 실패하면 세션 만료로 알리지 않고 재접속을 계속한다", async (_label, makeFailure) => {
      const { client, connected, onSessionExpired, refreshAccessToken } = setup({ refreshAccessToken: () => Promise.reject(makeFailure()) });
      const handle = connected();

      serverError(handle, "TOKEN_EXPIRED");
      serverCloses(handle);
      await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalledTimes(1));
      await expect(handle.attempt()).resolves.toEqual({ Authorization: "Bearer old-token" });

      expect(onSessionExpired).not.toHaveBeenCalled();
      expect(client.getSnapshot()).toBe("reconnecting");
      expect(handle.deactivateCalls).toBe(0);
    });

    it("UNAUTHORIZED 는 재발급을 한 번 부르고 새 토큰으로 다시 붙는다", async () => {
      const { handles, connected, refreshAccessToken, onSessionExpired } = setup();
      const handle = connected();

      serverError(handle, "UNAUTHORIZED");
      serverCloses(handle);

      await expect(handle.attempt()).resolves.toEqual({ Authorization: "Bearer new-token" });
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(onSessionExpired).not.toHaveBeenCalled();
      expect(handles).toHaveLength(1);
    });

    it("UNAUTHORIZED 뒤 재발급이 401 로 거절되면 세션 만료로 알리고 다시 붙지 않는다", async () => {
      const { client, connected, onSessionExpired, refreshAccessToken } = setup({
        refreshAccessToken: () => Promise.reject(new ApiError(401, "UNAUTHORIZED", "refresh 없음")),
      });
      const handle = connected();

      serverError(handle, "UNAUTHORIZED");
      serverCloses(handle);
      await vi.waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));

      expect(client.getSnapshot()).toBe("disconnected");
      expect(handle.deactivateCalls).toBe(1);
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });

    // Ruling 905 — 재발급이 거절된 것이 아니라 못 한 것이면 로그인으로 보내지 않는다.
    it.each([
      ["망 오류", () => new NetworkError(new TypeError("Failed to fetch"))],
      ["5xx", () => new ApiError(500, "INTERNAL", "서버 오류")],
      ["시간 초과", () => new DOMException("timeout", "TimeoutError")],
    ])("UNAUTHORIZED 뒤 재발급이 %s 로 실패하면 세션 만료로 알리지 않고 재접속을 계속한다", async (_label, makeFailure) => {
      const { client, connected, onSessionExpired, refreshAccessToken } = setup({ refreshAccessToken: () => Promise.reject(makeFailure()) });
      const handle = connected();

      serverError(handle, "UNAUTHORIZED");
      serverCloses(handle);
      await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalledTimes(1));
      await handle.attempt();

      expect(onSessionExpired).not.toHaveBeenCalled();
      expect(client.getSnapshot()).toBe("reconnecting");
      expect(handle.deactivateCalls).toBe(0);
    });

    it("재발급한 토큰으로도 UNAUTHORIZED 면 재발급을 또 부르지 않고 세션 만료로 알린다", async () => {
      const { client, handles, connected, refreshAccessToken, onSessionExpired } = setup();
      const handle = connected();
      serverError(handle, "UNAUTHORIZED");
      serverCloses(handle);
      await handle.attempt();

      serverError(handle, "UNAUTHORIZED");
      serverCloses(handle);

      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
      expect(client.getSnapshot()).toBe("disconnected");
      expect(handle.deactivateCalls).toBe(1);
      expect(handles).toHaveLength(1);
    });

    it("연결에 성공한 뒤의 UNAUTHORIZED 는 다시 한 번 재발급을 시도한다", async () => {
      const { connected, refreshAccessToken } = setup();
      const handle = connected();
      serverError(handle, "UNAUTHORIZED");
      serverCloses(handle);
      await handle.attempt();
      handle.open();

      serverError(handle, "UNAUTHORIZED");
      serverCloses(handle);
      await handle.attempt();

      expect(refreshAccessToken).toHaveBeenCalledTimes(2);
    });

    it("재발급을 기다리는 사이 disconnect() 가 불리면 재발급이 거절돼도 세션 만료를 알리지 않는다", async () => {
      let rejectRefresh: (failure: unknown) => void = () => {};
      const { client, connected, onSessionExpired } = setup({
        refreshAccessToken: () => new Promise<string>((_resolve, reject) => (rejectRefresh = reject)),
      });
      const handle = connected();
      serverError(handle, "TOKEN_EXPIRED");
      serverCloses(handle);

      client.disconnect();
      rejectRefresh(new ApiError(401, "UNAUTHORIZED", "만료"));
      await Promise.resolve();
      await Promise.resolve();

      expect(onSessionExpired).not.toHaveBeenCalled();
      expect(client.getSnapshot()).toBe("disconnected");
    });

    // 옛 연결에서 받은 ERROR 표식이 새 연결의 평범한 끊김을 재발급 경로로 끌고 가면 안 된다.
    it("UNAUTHORIZED 표식은 disconnect() 뒤 새 connect() 로 지워진다 — 이어진 평범한 끊김은 재발급 없이 재접속한다", () => {
      const { client, handles, refreshAccessToken, onSessionExpired } = setup();
      client.connect();
      serverError(handles[0], "UNAUTHORIZED");
      client.disconnect();
      client.connect();
      expect(handles).toHaveLength(2);

      serverCloses(handles[1], 1006);

      expect(client.getSnapshot()).toBe("reconnecting");
      expect(refreshAccessToken).not.toHaveBeenCalled();
      expect(onSessionExpired).not.toHaveBeenCalled();
    });
  });

  // 같은 목적지를 여러 호출부(승인 대기 · 비상 알림 · 화면)가 각자 구독해도 서버로 가는 SUBSCRIBE 는 1번이다.
  describe("같은 목적지 구독 공유", () => {
    const destination = "/topic/academy/1/live";
    const runStarted = { event: "run_started", run_id: 7, occurred_at: "t", payload: {} };

    it("같은 목적지를 3번 구독해도 STOMP SUBSCRIBE 는 1번이고 방송은 3곳 모두 받는다", () => {
      const { client, connected } = setup();
      const handle = connected();
      const listeners = [vi.fn(), vi.fn(), vi.fn()];
      for (const listener of listeners) client.subscribe(destination, listener);

      expect(handle.subscribedDestinations).toEqual([destination]);
      handle.emit(destination, runStarted);
      for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1);
    });

    it("마지막 구독자가 해제할 때 UNSUBSCRIBE 1번 — 앞선 해제는 남은 구독자의 수신을 끊지 않는다", () => {
      const { client, connected } = setup();
      const handle = connected();
      const [first, second, third] = [vi.fn(), vi.fn(), vi.fn()];
      const offFirst = client.subscribe(destination, first);
      const offSecond = client.subscribe(destination, second);
      const offThird = client.subscribe(destination, third);

      offFirst();
      offSecond();
      handle.emit(destination, runStarted);
      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
      expect(third).toHaveBeenCalledTimes(1);

      offThird();
      // 가짜 STOMP 는 구독 해제가 실제로 불려야 목적지 콜백을 지운다 — 지워졌으면 emit 이 던진다.
      expect(() => handle.emit(destination, runStarted)).toThrow("구독하지 않은 목적지");
    });

    it("같은 구독자가 해제 함수를 두 번 불러도 다른 구독자의 구독은 그대로다", () => {
      const { client, connected } = setup();
      const handle = connected();
      const kept = vi.fn();
      const offGone = client.subscribe(destination, vi.fn());
      client.subscribe(destination, kept);

      offGone();
      offGone();
      handle.emit(destination, runStarted);
      expect(kept).toHaveBeenCalledTimes(1);
    });

    it("첫 수신자가 던져도 같은 방송을 두 번째 수신자가 받고, 오류는 디버그 훅으로 알린다", () => {
      const { client, connected, onDebugMessage } = setup();
      const handle = connected();
      const second = vi.fn();
      client.subscribe(destination, () => {
        throw new Error("화면 쪽 오류");
      });
      client.subscribe(destination, second);

      expect(() => handle.emit(destination, runStarted)).not.toThrow();
      expect(second).toHaveBeenCalledTimes(1);
      expect(onDebugMessage).toHaveBeenCalledWith(expect.stringContaining("화면 쪽 오류"));
    });

    it("목적지가 다르면 각각 구독한다", () => {
      const { client, connected } = setup();
      const handle = connected();
      client.subscribe(destination, () => {});
      client.subscribe("/topic/admin/live", () => {});
      expect(handle.subscribedDestinations).toEqual([destination, "/topic/admin/live"]);
    });
  });
});

// `Ruling 901` — 접근 토큰 만료 60초 전 재발급 → 지금 연결을 닫고 새 토큰으로 다시 접속(연결은 언제나 1개) → 구독 복원(호출부) → 화면 REST 재조회 1회.
describe("AcademyRealtimeClient — 토큰 갱신은 연결 하나를 닫고 다시 여는 것", () => {
  const LEAD_MS = 60_000;
  const makeJwt = (expSeconds: number): string => {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "");
    return `${encode({ alg: "HS256" })}.${encode({ exp: expSeconds })}.sig`;
  };
  const nowSeconds = () => Math.floor(Date.now() / 1000);

  beforeEach(() => {
    vi.useFakeTimers();
    // 토큰 만료는 초 단위라, 시계를 정각에 맞춰야 "60초 전" 이 밀리초까지 정확하다.
    vi.setSystemTime(new Date("2026-10-17T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // 만료 120초짜리 토큰으로 연결해 connected 까지 만든다 — 재발급은 만료 60초 전(= 60초 뒤)에 시작한다.
  // 재발급 성공 시 저장소에는 900초 더 오래 가는 새 토큰이 들어간다.
  const connectedWithShortToken = async (refresh?: () => Promise<string>) => {
    const first = makeJwt(nowSeconds() + 120);
    const renewed = makeJwt(nowSeconds() + 120 + 900);
    let stored: string | null = first;
    const refreshAccessToken = vi.fn(
      refresh ??
        (async () => {
          stored = renewed;
          return renewed;
        }),
    );
    const { factory, handles } = createFakeClientFactory();
    const onSessionExpired = vi.fn();
    const states: string[] = [];
    const client = new AcademyRealtimeClient({
      url: "ws://x",
      createClient: factory,
      readAccessToken: () => stored,
      refreshAccessToken,
      onSessionExpired,
    });
    client.connect();
    await handles[0].attempt();
    handles[0].open();
    // connected 이후의 상태 변화만 모은다.
    client.onConnectionStateChange(() => states.push(client.getSnapshot()));
    return { client, handles, refreshAccessToken, states, renewed, onSessionExpired };
  };

  it("만료 60초 전에 재발급하고 같은 클라이언트를 닫았다 다시 연다 — 두 번째 연결은 만들지 않는다", async () => {
    const { client, handles, refreshAccessToken } = await connectedWithShortToken();

    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS - 1);
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(client.getSnapshot()).toBe("connected");

    await vi.advanceTimersByTimeAsync(1);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(handles).toHaveLength(1);
    expect(handles[0].deactivateCalls).toBe(1);
    expect(handles[0].activateCalls).toBe(2);
  });

  // 계획된 갱신은 재접속 안내 띠를 띄우지 않는다 — `Ruling 901` 이 받아들이는 것은 방송 공백 1~2초이지 눈에 보이는 재접속 상태가 아니다.
  it("갱신하는 동안 연결 상태는 connected 를 벗어나지 않는다 — 재접속 안내(reconnecting)를 거치지 않는다", async () => {
    const { client, handles, states } = await connectedWithShortToken();

    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);
    expect(client.getSnapshot()).toBe("connected");
    await handles[0].attempt();
    handles[0].open();

    expect(states).not.toContain("reconnecting");
    expect(client.getSnapshot()).toBe("connected");
  });

  // 상태가 그대로 connected 라 호출부는 상태 변화로 다시 접속을 알 수 없다 — 접속 세대 번호가 올라가고 리스너가 불린다.
  it("다시 접속이 끝나면 접속 세대 번호가 오르고 리스너에 알린다 — 호출부가 구독을 새로 걸고 화면을 한 번 다시 읽는 신호", async () => {
    const { client, handles } = await connectedWithShortToken();
    const epochBefore = client.getEpoch();
    const notifications: number[] = [];
    client.onConnectionStateChange(() => notifications.push(client.getEpoch()));

    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);
    expect(client.getEpoch()).toBe(epochBefore);
    handles[0].open();

    expect(client.getEpoch()).toBe(epochBefore + 1);
    expect(notifications).toEqual([epochBefore + 1]);
  });

  // 레이스 (a): 옛 소켓의 닫힘 콜백이 `deactivate()` 가 끝난 뒤에 도착해도 끊김 처리(재발급 · 세션 만료 · 재접속 안내)를 타지 않는다.
  it("닫기가 끝난 뒤에 늦게 도착한 옛 소켓의 닫힘은 끊김으로 처리하지 않는다", async () => {
    const { client, handles, refreshAccessToken, onSessionExpired, states } = await connectedWithShortToken();
    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);
    await vi.advanceTimersByTimeAsync(0);

    handles[0].config.onStompError({ headers: { message: "UNAUTHORIZED" }, body: "" });
    handles[0].config.onWebSocketClose({ code: 1000 });

    expect(client.getSnapshot()).toBe("connected");
    expect(states).not.toContain("reconnecting");
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  // 레이스 (b): 갱신하는 동안 `connect()`(= 브라우저 online · 탭 복귀가 부른다)가 두 번째 접속을 만들지 않는다.
  it("갱신하는 동안 connect() 를 불러도 아무 일도 없다 — 두 번째 접속을 만들지 않는다", async () => {
    const { client, handles } = await connectedWithShortToken();
    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);
    const activateBefore = handles[0].activateCalls;
    const deactivateBefore = handles[0].deactivateCalls;

    client.connect();

    expect(handles).toHaveLength(1);
    expect(handles[0].activateCalls).toBe(activateBefore);
    expect(handles[0].deactivateCalls).toBe(deactivateBefore);
  });

  it("다시 접속이 평소 재접속보다 오래 걸리면 reconnecting 으로 내려가 평소 경로를 탄다", async () => {
    const { client, handles, states } = await connectedWithShortToken();
    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);
    expect(client.getSnapshot()).toBe("connected");

    await vi.advanceTimersByTimeAsync(5_000);

    expect(client.getSnapshot()).toBe("reconnecting");
    expect(states).toEqual(["reconnecting"]);
    // 이제부터의 닫힘은 평범한 끊김이다.
    handles[0].config.onWebSocketClose({ code: 1006 });
    expect(client.getSnapshot()).toBe("reconnecting");
  });

  it("다시 접속하는 시도는 재발급한 새 토큰을 싣고, 연결되면 다음 갱신을 새 토큰의 만료 기준으로 예약한다", async () => {
    const { client, handles, refreshAccessToken, renewed, states } = await connectedWithShortToken();
    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);

    await expect(handles[0].attempt()).resolves.toEqual({ Authorization: `Bearer ${renewed}` });
    handles[0].open();
    expect(client.getSnapshot()).toBe("connected");
    expect(states).toEqual(["connected"]);

    // 새 토큰은 처음 토큰보다 900초 더 오래 간다 — 시작 후 960초(= 1020 - 60)가 되기 전에는 재발급이 다시 나가지 않는다(지금은 60초째).
    await vi.advanceTimersByTimeAsync(900_000 - 1);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refreshAccessToken).toHaveBeenCalledTimes(2);
  });

  it("닫고 다시 여는 동안 구독은 비워진다 — 호출부는 connected 를 다시 받아 구독을 새로 건다", async () => {
    const { client, handles } = await connectedWithShortToken();
    const unsubscribe = client.subscribe("/topic/academy/1/live", () => {});
    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);

    expect(() => unsubscribe()).not.toThrow();
    handles[0].open();
    // 옛 세션의 구독 해제는 새 접속에 UNSUBSCRIBE 를 보내지 않는다.
    expect(handles[0].unsubscribeCalls).toBe(0);
    client.subscribe("/topic/academy/1/live", () => {});
    expect(handles[0].subscribedDestinations).toEqual(["/topic/academy/1/live", "/topic/academy/1/live"]);
  });

  it("우리가 연 닫힘은 끊김으로 취급하지 않는다 — 재발급을 또 부르지 않고 세션 만료도 알리지 않는다", async () => {
    const { client, handles, refreshAccessToken, onSessionExpired } = await connectedWithShortToken();
    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);

    // 닫기가 끝나는 순간 stompjs 가 부르는 닫힘 콜백.
    handles[0].config.onWebSocketClose({ code: 1000 });

    expect(client.getSnapshot()).toBe("connected");
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("재발급이 실패하면 연결을 그대로 둔다 — 닫지 않고 상태도 바꾸지 않는다", async () => {
    const { client, handles, refreshAccessToken, states } = await connectedWithShortToken(() =>
      Promise.reject(new NetworkError(new TypeError("fail"))),
    );

    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(handles[0].deactivateCalls).toBe(0);
    expect(client.getSnapshot()).toBe("connected");
    expect(states).toEqual([]);
  });

  it("재발급을 기다리는 사이 disconnect() 가 불리면 닫았다 여는 일을 하지 않는다", async () => {
    let finish: (token: string) => void = () => {};
    const { client, handles } = await connectedWithShortToken(() => new Promise<string>((resolve) => (finish = resolve)));
    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);

    client.disconnect();
    finish("later");
    await vi.advanceTimersByTimeAsync(0);

    expect(handles[0].activateCalls).toBe(1);
    expect(handles[0].deactivateCalls).toBe(1);
    expect(client.getSnapshot()).toBe("disconnected");
  });

  it("만료 시각을 읽을 수 없는 토큰이면 갱신을 예약하지 않는다", async () => {
    const { factory, handles } = createFakeClientFactory();
    const refreshAccessToken = vi.fn(async () => "x");
    const client = new AcademyRealtimeClient({ url: "ws://x", createClient: factory, readAccessToken: () => "opaque-token", refreshAccessToken });
    client.connect();
    await handles[0].attempt();
    handles[0].open();

    await vi.advanceTimersByTimeAsync(10 * 60_000);

    expect(refreshAccessToken).not.toHaveBeenCalled();
  });
});
