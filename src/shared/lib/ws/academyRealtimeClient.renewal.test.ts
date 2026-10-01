import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AcademyRealtimeClient } from "./academyRealtimeClient";
import type { StompClientConfig, StompClientLike, StompMessageLike } from "./stompClient";

// 접근 토큰 만료 전 무중단 갱신(R46-LATERRT C-14) — 가짜 시계와 가짜 STOMP 클라이언트로 갈아타기의 순서를 잰다.
// 판정 대상은 "만료 60초 전 재발급 → 두 번째 연결 → 구독 이전 → 확인 대기 → 옛 연결 종료" 한 줄기다.

const DESTINATION = "/topic/academy/1/live";
const OTHER_DESTINATION = "/topic/admin/live";
const SETTLE_MS = 1500;
const LEAD_MS = 60_000;

const makeJwt = (expSeconds: number): string => {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode({ exp: expSeconds })}.sig`;
};

type FakeHandle = {
  config: StompClientConfig;
  deactivateCalls: number;
  connected: boolean;
  subscribed: string[];
  unsubscribed: string[];
  open: () => void;
  emit: (destination: string, body: unknown) => void;
};

const createFakeFactory = () => {
  const handles: FakeHandle[] = [];
  const factory = (config: StompClientConfig): StompClientLike => {
    const callbacks = new Map<string, (message: StompMessageLike) => void>();
    const handle: FakeHandle = {
      config,
      deactivateCalls: 0,
      connected: false,
      subscribed: [],
      unsubscribed: [],
      open: () => {
        handle.connected = true;
        config.onConnect({ headers: {}, body: "" });
      },
      emit: (destination, body) => callbacks.get(destination)?.({ body: JSON.stringify(body) }),
    };
    handles.push(handle);
    return {
      activate: () => {},
      deactivate: () => {
        handle.deactivateCalls += 1;
        handle.connected = false;
        return Promise.resolve();
      },
      subscribe: (destination, callback) => {
        handle.subscribed.push(destination);
        callbacks.set(destination, callback);
        return { unsubscribe: () => handle.unsubscribed.push(destination) };
      },
      get connected() {
        return handle.connected;
      },
    };
  };
  return { factory, handles };
};

const envelope = (n: number) => ({ event: "position", run_id: 1, occurred_at: `t${n}`, payload: { lat: n } });

const nowSeconds = () => Math.floor(Date.now() / 1000);

// 만료 120초짜리 토큰으로 연결해 `connected` 까지 만든다 — 갈아타기는 만료 60초 전(= 60초 뒤)에 시작한다.
const connectedClient = (refresh: () => Promise<string>) => {
  const { factory, handles } = createFakeFactory();
  const client = new AcademyRealtimeClient({
    url: "ws://x",
    createClient: factory,
    readAccessToken: () => makeJwt(nowSeconds() + 120),
    refreshAccessToken: refresh,
  });
  client.connect();
  handles[0].open();
  return { client, handles };
};

// 갈아타기가 시작돼 두 번째 연결이 열리고 `CONNECTED` 를 받은 상태까지 진행한다.
const startSwap = async (handles: FakeHandle[]) => {
  await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);
  handles[1].open();
};

describe("AcademyRealtimeClient — 만료 전 무중단 갱신", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("만료 60초 전에 재발급하고 새 토큰으로 두 번째 연결을 연다", async () => {
    const refresh = vi.fn().mockResolvedValue(makeJwt(nowSeconds() + 900));
    const { handles } = connectedClient(refresh);

    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS - 1);
    expect(refresh).not.toHaveBeenCalled();
    expect(handles).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(handles).toHaveLength(2);
    expect(handles[1].config.connectHeaders.Authorization).toBe(`Bearer ${await refresh.mock.results[0].value}`);
  });

  it("새 연결에 구독을 모두 건 뒤 확인 대기 시간이 지나야 옛 연결을 닫는다", async () => {
    const { client, handles } = connectedClient(() => Promise.resolve(makeJwt(nowSeconds() + 900)));
    client.subscribe(DESTINATION, () => {});
    client.subscribe(OTHER_DESTINATION, () => {});

    await startSwap(handles);
    expect(handles[1].subscribed).toEqual([DESTINATION, OTHER_DESTINATION]);
    expect(handles[0].deactivateCalls).toBe(0);

    await vi.advanceTimersByTimeAsync(SETTLE_MS - 1);
    expect(handles[0].deactivateCalls).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(handles[0].deactivateCalls).toBe(1);
  });

  it("갈아타는 동안 연결 상태는 바뀌지도 알리지도 않는다", async () => {
    const { client, handles } = connectedClient(() => Promise.resolve(makeJwt(nowSeconds() + 900)));
    const listener = vi.fn();
    client.onConnectionStateChange(listener);

    await startSwap(handles);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    handles[0].config.onWebSocketClose({});

    expect(handles[0].deactivateCalls).toBe(1);
    expect(listener).not.toHaveBeenCalled();
    expect(client.getSnapshot()).toBe("connected");
    expect(handles).toHaveLength(2);
  });

  it("겹치는 동안 두 연결에서 같은 방송이 와도 한 번만 전달하고, 옛 연결을 닫은 뒤 늦게 온 쌍둥이도 거른다", async () => {
    const { client, handles } = connectedClient(() => Promise.resolve(makeJwt(nowSeconds() + 900)));
    const received = vi.fn();
    client.subscribe(DESTINATION, received);

    await startSwap(handles);
    handles[0].emit(DESTINATION, envelope(1));
    handles[1].emit(DESTINATION, envelope(1));
    handles[1].emit(DESTINATION, envelope(2));
    expect(received).toHaveBeenCalledTimes(2);
    // 3번 방송은 옛 연결로만 먼저 왔다 — 쌍둥이는 옛 연결을 닫은 뒤에 새 연결로 늦게 온다.
    handles[0].emit(DESTINATION, envelope(3));
    expect(received).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(handles[0].deactivateCalls).toBe(1);
    // 닫힌 옛 연결이 늦게 내보낸 프레임은 버린다.
    handles[0].emit(DESTINATION, envelope(9));
    expect(received).toHaveBeenCalledTimes(3);
    handles[1].emit(DESTINATION, envelope(3));
    expect(received).toHaveBeenCalledTimes(3);
    handles[1].emit(DESTINATION, envelope(4));
    expect(received).toHaveBeenCalledTimes(4);

    // 거르는 창은 짧다 — 한참 뒤의 같은 본문은 새 방송으로 전달한다.
    await vi.advanceTimersByTimeAsync(10_000);
    handles[1].emit(DESTINATION, envelope(3));
    expect(received).toHaveBeenCalledTimes(5);
  });

  it("갈아타는 중에 새로 건 구독도 새 연결로 옮겨져 옛 연결을 닫은 뒤에도 방송을 받는다", async () => {
    const { client, handles } = connectedClient(() => Promise.resolve(makeJwt(nowSeconds() + 900)));

    await startSwap(handles);
    const received = vi.fn();
    client.subscribe(OTHER_DESTINATION, received);
    expect(handles[1].subscribed).toEqual([OTHER_DESTINATION]);

    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    handles[1].emit(OTHER_DESTINATION, envelope(1));
    expect(received).toHaveBeenCalledTimes(1);
  });

  it("재발급이 실패하면 연결을 그대로 두고, 만료 뒤에는 기존 흐름(TOKEN_EXPIRED → 재발급 → 재연결)으로 넘어간다", async () => {
    const refresh = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce("fresh-token");
    const { client, handles } = connectedClient(refresh);

    await vi.advanceTimersByTimeAsync(120_000 - LEAD_MS);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(handles).toHaveLength(1);
    expect(handles[0].deactivateCalls).toBe(0);
    expect(client.getSnapshot()).toBe("connected");

    handles[0].config.onStompError({ headers: { message: "TOKEN_EXPIRED" }, body: "" });
    handles[0].config.onWebSocketClose({});
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(handles).toHaveLength(2);
    expect(handles[1].config.connectHeaders.Authorization).toBe("Bearer fresh-token");
  });

  it("새 연결이 거부되면 옛 연결을 그대로 쓰고 새 연결만 닫는다", async () => {
    const { client, handles } = connectedClient(() => Promise.resolve(makeJwt(nowSeconds() + 900)));
    const received = vi.fn();
    client.subscribe(DESTINATION, received);

    await startSwap(handles);
    handles[1].config.onStompError({ headers: { message: "FORBIDDEN" }, body: "" });
    handles[1].config.onWebSocketClose({});
    await vi.advanceTimersByTimeAsync(SETTLE_MS);

    expect(handles[1].deactivateCalls).toBe(1);
    expect(handles[0].deactivateCalls).toBe(0);
    expect(client.getSnapshot()).toBe("connected");
    handles[0].emit(DESTINATION, envelope(1));
    expect(received).toHaveBeenCalledTimes(1);
  });

  it("갈아탄 뒤 옛 연결의 닫힘 신호는 현재 연결의 끊김으로 취급하지 않는다", async () => {
    const { client, handles } = connectedClient(() => Promise.resolve(makeJwt(nowSeconds() + 900)));
    await startSwap(handles);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);

    handles[0].config.onWebSocketClose({});
    expect(client.getSnapshot()).toBe("connected");
    expect(handles).toHaveLength(2);
  });

  it("갈아탄 뒤 구독 해제는 새 연결의 구독을 풀고, 다음 갈아타기는 새 토큰의 만료 기준으로 잡힌다", async () => {
    const refresh = vi.fn().mockResolvedValue(makeJwt(nowSeconds() + 900));
    const { client, handles } = connectedClient(refresh);
    const unsubscribe = client.subscribe(DESTINATION, () => {});

    await startSwap(handles);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    unsubscribe();
    expect(handles[1].unsubscribed).toEqual([DESTINATION]);

    // 새 토큰은 첫 시각 기준 900초 뒤 만료 — 두 번째 갈아타기는 840초째. 지금은 61.5초째.
    await vi.advanceTimersByTimeAsync(900_000 - LEAD_MS - (120_000 - LEAD_MS) - SETTLE_MS - 1);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("disconnect() 하면 예약된 갈아타기를 취소한다", async () => {
    const refresh = vi.fn().mockResolvedValue(makeJwt(nowSeconds() + 900));
    const { client } = connectedClient(refresh);

    client.disconnect();
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("만료 시각을 읽을 수 없는 토큰이면 갈아타기를 예약하지 않는다", async () => {
    const refresh = vi.fn();
    const { factory, handles } = createFakeFactory();
    const client = new AcademyRealtimeClient({
      url: "ws://x",
      createClient: factory,
      readAccessToken: () => "not-a-jwt",
      refreshAccessToken: refresh,
    });
    client.connect();
    handles[0].open();

    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(refresh).not.toHaveBeenCalled();
  });
});
