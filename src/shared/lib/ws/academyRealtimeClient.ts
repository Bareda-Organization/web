import { getAccessToken, refreshAccessToken as defaultRefreshAccessToken } from "../http";
import { ApiError } from "../http/apiError";
import { notifyAuthGate } from "../http/authGate";
import { readJwtExpiryMs } from "./jwtExpiry";
import type { WsConnectionState } from "./wsConnectionState";
import { parseWebSocketEnvelope, type WebSocketEnvelope } from "./webSocketEnvelope";
import {
  createStompClient,
  type StompClientFactory,
  type StompClientLike,
  type StompFrameLike,
  type StompSubscriptionLike,
} from "./stompClient";

export type AcademyRealtimeClientOptions = {
  url: string;
  // 시험이 실제 WebSocket 없이 가짜 STOMP 클라이언트를 주입하는 자리 — `stompClient.ts` 참고.
  createClient?: StompClientFactory;
  // 연결 시도마다 부른다 — 재발급이 저장소에 넣은 새 토큰을 다음 시도가 그대로 집는다.
  readAccessToken?: () => string | null;
  // 재발급 창구 — 기본값은 동시 재발급을 1회로 묶는 `refreshClient.ts` 의 함수다(REST 401 처리와 같은 창구를 써야 refresh 토큰 1회용 회전과 부딪히지 않는다).
  refreshAccessToken?: () => Promise<string>;
  // 재발급이 거절됐을 때(refresh 토큰도 무효) 알릴 창구 — 기본값은 REST 401 처리와 같은 `notifyAuthGate`.
  onSessionExpired?: () => void;
  onDebugMessage?: (message: string) => void;
};

type ConnectionStateListener = () => void;

// 남의 학원 채널을 구독했을 때 서버가 STOMP ERROR `message` 헤더에 싣는 코드.
const SCOPE_VIOLATION_MESSAGE = "ACADEMY_SCOPE_VIOLATION";

// 서버가 소켓을 닫을 때 싣는 종료 코드(`API_SPEC §7.2`). ERROR 프레임을 놓쳐도 닫힘 코드로 같은 판정이 서게 한다.
// 4403 구독 거부 — 다시 붙어도 같은 이유로 거절되니 멈춘다. 4500 세션 회수 — 계정이 채널 권한을 잃어 서버가 닫았으니 stompjs 의 첫 대기(1초)로
// 다시 붙어 구독을 새로 건다(여전히 금지된 채널은 서버가 4403 으로 거절한다). 그 밖의 코드(1008 CONNECT 마감 초과 포함)는 평범한 재접속이다.
const CLOSE_SUBSCRIPTION_FORBIDDEN = 4403;

// 접근 토큰 만료 이 시간 전에 재발급하고 연결을 새 토큰으로 다시 연다(`Ruling 901` · `API_SPEC §7.2`). 클라이언트 시계가 서버보다 느려
// 재발급이 만료 뒤로 밀리면 서버의 `TOKEN_EXPIRED` 경로가 받는다.
const RENEW_LEAD_MS = 60_000;
// 만료가 이미 임박했거나 수명이 짧은 토큰이어도 재발급을 이 간격보다 촘촘히 반복하지 않는다.
const RENEW_MIN_DELAY_MS = 5_000;
// 계획된 갱신 중에는 연결 상태를 `connected` 로 두어 재접속 안내를 띄우지 않는다(`Ruling 901` 이 받아들이는 것은 방송 공백 1~2초). 다시 접속이 이 시간
// 안에 끝나지 않으면 평소 재접속과 같은 `reconnecting` 으로 내려가 안내를 띄운다.
const RENEW_GRACE_MS = 5_000;

// `subscribe()` 가 받은 구독 한 건 — 같은 목적지는 구독 한 건을 나눠 쓰고 `listeners` 가 그 목적지를 구독한 호출부 전부다.
type ActiveSubscription = {
  destination: string;
  listeners: Set<{ onEnvelope: (envelope: WebSocketEnvelope) => void }>;
  client: StompClientLike;
  handle: StompSubscriptionLike;
  // 소켓이 닫혀 이 구독이 서버에서 사라졌다 — 해제 함수가 새 접속에 UNSUBSCRIBE 를 보내지 않게 한다.
  stale: boolean;
};

// 재발급이 거절됐는가 — 401 만 refresh 토큰이 무효라는 뜻이다. 망 오류 · 5xx · 시간 초과는 일시적일 수 있어 세션 만료로 보지 않는다(`Ruling 905`).
const isRefreshRejected = (failure: unknown): boolean => failure instanceof ApiError && failure.status === 401;

// `/ws/location` 하나에 STOMP 로 붙는 클라이언트 — 연결은 언제나 1개다.
//
// 1. CONNECT 프레임에 `Authorization: Bearer {token}` 을 싣는다. 토큰은 연결 시도마다 새로 읽는다(토큰이 없으면 헤더를 안 싣는다).
// 2. 구독 거부(`FORBIDDEN` · 종료 코드 4403)면 `forbidden` 으로 멈춘다 — 화면 하나가 목적지 하나에 고정 구독하므로 바꿔 재시도할 곳이 없다.
// 3. 끊기면 stompjs 내장 재접속(1초에서 두 배씩, 30초 상한, 포기 없음)이 다시 붙는다. 재접속 때 구독은 이어지지 않으므로 호출부가
//    `connected` 를 다시 받아 구독을 새로 건다(`useRealtimeChannel`).
// 4. 만료 60초 전 재발급 → 연결을 닫고 새 토큰으로 다시 접속한다. 끊긴 사이의 방송은 화면이 REST 로 한 번 메운다.
// 5. 수신한 프레임을 `WebSocketEnvelope` 로 파싱해 넘긴다(id 흡수 포함).
//
// `subscribe()` 가 돌려주는 해제 함수는 호출부가 반드시 불러야 한다 — 화면 생명주기는 이 클래스가 모른다.
export class AcademyRealtimeClient {
  private readonly url: string;
  private readonly createClient: StompClientFactory;
  private readonly readAccessToken: () => string | null;
  private readonly refreshAccessToken: () => Promise<string>;
  private readonly onSessionExpired: () => void;
  private readonly onDebugMessage: (message: string) => void;

  private client: StompClientLike | null = null;
  // 직접 끊었거나 세션이 만료돼 더는 자동으로 붙지 않는 상태.
  private manuallyDisconnected = true;
  // 이번 연결이 끊긴 원인이 ERROR `TOKEN_EXPIRED` / `UNAUTHORIZED` 였는지 — ERROR 프레임이 먼저 오고 소켓은 뒤에 닫히므로 닫힌 뒤에 처리한다.
  private tokenExpired = false;
  private unauthorized = false;
  // UNAUTHORIZED 로 재발급한 토큰으로 다시 붙은 뒤 `CONNECTED` 를 받기 전까지 참 — 이때 또 UNAUTHORIZED 면 세션 만료로 넘긴다(재발급은 한 번).
  private refreshedAfterUnauthorized = false;
  // 끊긴 뒤 진행 중인 재발급 — 다음 접속 시도(`getConnectHeaders`)가 끝나기를 기다린 뒤 새 토큰을 읽는다. 실패해도 거절되지 않는 promise 다.
  private pendingRefresh: Promise<void> = Promise.resolve();
  // 이번 접속 시도가 실은 토큰 — `CONNECTED` 뒤 재발급 시각을 이 토큰의 만료로 잡는다.
  private connectedToken: string | null = null;

  private state: WsConnectionState = "disconnected";
  private readonly listeners = new Set<ConnectionStateListener>();
  // 지금 걸려 있는 구독 — 새 연결은 구독을 이어받지 않으므로 소켓이 닫힐 때 비운다.
  private readonly subscriptions = new Set<ActiveSubscription>();
  private renewTimer: ReturnType<typeof setTimeout> | null = null;
  // 재발급 뒤 연결을 닫고 다시 여는 계획된 갱신 중 참 — 이 동안 상태는 `connected` 로 두고, 옛 소켓의 닫힘을 끊김으로 오인하지 않으며, `connect()` 를 받지 않는다.
  private renewing = false;
  // 갱신으로 닫은 옛 소켓의 닫힘 콜백을 아직 못 받았다 — 첫 닫힘 하나만 무시한다. `deactivate()` 가 끝난 뒤 늦게 와도 끊김으로 처리하지 않는다.
  private awaitingOldClose = false;
  private renewGraceTimer: ReturnType<typeof setTimeout> | null = null;
  // 접속에 성공할 때마다 오른다 — 갱신은 상태가 `connected` 로 그대로라 호출부가 상태 변화로 다시 접속을 알 수 없어, 이 번호의 변화로 알린다.
  private epoch = 0;

  constructor(options: AcademyRealtimeClientOptions) {
    this.url = options.url;
    this.createClient = options.createClient ?? createStompClient;
    this.readAccessToken = options.readAccessToken ?? getAccessToken;
    this.refreshAccessToken = options.refreshAccessToken ?? defaultRefreshAccessToken;
    this.onSessionExpired = options.onSessionExpired ?? (() => notifyAuthGate({ type: "session-expired" }));
    this.onDebugMessage = options.onDebugMessage ?? (() => {});
  }

  // `useSyncExternalStore` 의 `getSnapshot` 자리에 그대로 넘길 수 있게 화살표 필드로 둔다 — 메서드를 훅에 넘기면 `this` 바인딩이 갈릴 수 있다.
  getSnapshot = (): WsConnectionState => this.state;

  // 접속 세대 번호 — 상태가 같은 `connected` 여도 새 접속이면 달라진다(구독을 새로 걸고 화면을 한 번 다시 읽을 때를 안다).
  getEpoch = (): number => this.epoch;

  onConnectionStateChange = (listener: ConnectionStateListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // 연결을 시작한다. 연결 중 · 연결됨이면 무시한다 — 호출부가 상태를 확인한 뒤 부르는 사이 상태가 바뀌어도 살아 있는 연결을 버리지 않는다.
  // `forbidden` · 재접속 대기(`reconnecting`)에서 부르면 대기를 건너뛰고 지금 다시 붙는다.
  connect(): void {
    if (this.renewing || this.state === "connecting" || this.state === "connected") return;
    this.manuallyDisconnected = false;
    this.tokenExpired = false;
    this.unauthorized = false;
    this.refreshedAfterUnauthorized = false;
    this.setState("connecting");
    if (this.client === null) {
      this.client = this.createClient({
        brokerURL: this.url,
        getConnectHeaders: () => this.getConnectHeaders(),
        onConnect: () => this.handleConnected(),
        onStompError: (frame) => this.handleStompError(frame),
        onWebSocketClose: (event) => this.handleClosed(event.code),
        onWebSocketError: (event) => this.onDebugMessage(`[AcademyRealtimeClient] WebSocket error: ${String(event)}`),
      });
    } else {
      // 재접속 대기 중이면 대기를 끊고 곧바로 다시 연다(비활성 상태면 아무 일도 없다).
      this.client.deactivate().catch(() => {});
    }
    this.client.activate();
  }

  // 재접속을 멈추고 연결을 닫는다. 화면 언마운트 · 로그아웃 시 호출한다.
  disconnect(): void {
    this.manuallyDisconnected = true;
    this.clearRenewTimer();
    this.endRenewal();
    this.dropSubscriptions();
    // 서버가 소켓을 이미 닫은 뒤의 deactivate() 는 죽은 소켓에 쓰다 예외가 날 수 있다 — 끊으려던 연결이니 무시한다.
    this.client?.deactivate().catch(() => {});
    this.client = null;
    this.setState("disconnected");
  }

  // [destination] 을 구독하고, 프레임마다 파싱한 [WebSocketEnvelope] 를 [onEnvelope] 에 넘긴다. 반환값을 호출부가 언마운트 시 불러야 구독이
  // 해제된다. `connected` 상태가 아닐 때 부르면 던진다.
  subscribe(destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void): () => void {
    const client = this.client;
    if (client === null || !client.connected) {
      throw new Error(
        `연결되지 않은 상태에서 subscribe(${destination}) 를 호출했다 — connected 상태가 된 뒤에 구독하라.`,
      );
    }
    const listener = { onEnvelope };
    // 같은 목적지를 이미 구독 중이면 서버에는 다시 SUBSCRIBE 하지 않고 받는 쪽만 늘린다 — 서버는 같은 방송을 구독 수만큼 복제해 보낸다.
    let entry = [...this.subscriptions].find((candidate) => candidate.destination === destination);
    if (entry === undefined) {
      const created: ActiveSubscription = {
        destination,
        listeners: new Set(),
        client,
        handle: client.subscribe(destination, (message) => this.deliver(created, message.body)),
        stale: false,
      };
      this.subscriptions.add(created);
      entry = created;
    }
    const shared = entry;
    shared.listeners.add(listener);
    return () => {
      // 마지막 구독자가 떠날 때만 서버 구독을 푼다. 이미 푼 구독의 해제 함수를 다시 불러도 아무 일도 없다.
      if (!shared.listeners.delete(listener) || shared.listeners.size > 0) return;
      this.subscriptions.delete(shared);
      // 소켓이 이미 닫혔으면 stompjs 의 unsubscribe() 가 TypeError 를 던진다 — 재접속으로 상태가 바뀔 때 effect 정리 단계가 이 함수를
      // 부르므로 던지면 화면이 오류 경계로 떨어진다. 연결이 없으면 서버 쪽 구독도 이미 사라졌다.
      if (!shared.stale && shared.client.connected) shared.handle.unsubscribe();
    };
  }

  // 접속 시도마다 stompjs 가 부른다. 끊김 뒤 재발급이 진행 중이면 끝나기를 기다렸다가 저장소의 최신 토큰을 읽는다.
  private async getConnectHeaders(): Promise<Record<string, string>> {
    await this.pendingRefresh;
    const token = this.readAccessToken();
    this.connectedToken = token;
    return token === null ? {} : { Authorization: `Bearer ${token}` };
  }

  private handleConnected(): void {
    this.refreshedAfterUnauthorized = false;
    this.endRenewal();
    this.epoch += 1;
    this.setState("connected");
    if (this.connectedToken !== null) this.scheduleRenewal(this.connectedToken);
  }

  private handleStompError(frame: StompFrameLike): void {
    const message = frame.headers.message;
    // `StompAuthChannelInterceptor` 의 SUBSCRIBE 거부는 전부 `FORBIDDEN` 이고, 남의 학원 채널은 `ACADEMY_SCOPE_VIOLATION` 이다.
    if (message === "FORBIDDEN" || message === SCOPE_VIOLATION_MESSAGE) {
      this.setState("forbidden");
    }
    // 연결에 쓰인 access 토큰이 만료되면 서버가 이 프레임으로 세션을 닫는다(`API_SPEC §7`). 재발급은 소켓이 실제로 닫힌 뒤(`handleClosed`)에 시작한다.
    if (message === "TOKEN_EXPIRED") this.tokenExpired = true;
    // 토큰이 없거나 무효(위조 · access 가 아닌 토큰)다 — 같은 토큰으로 다시 붙어 봐야 같은 거절이다(`API_SPEC §1.11`).
    if (message === "UNAUTHORIZED") this.unauthorized = true;
    this.onDebugMessage(`[AcademyRealtimeClient] STOMP ERROR: ${JSON.stringify(frame.headers)} ${frame.body}`);
  }

  // 소켓이 닫혔다(첫 접속 실패 포함). 멈출 경우가 아니면 stompjs 가 이 콜백 직후 다음 접속을 예약한다.
  private handleClosed(closeCode?: number): void {
    if (this.renewing) {
      // 갱신으로 닫은 옛 소켓의 닫힘은 한 번만 무시한다. 그 뒤의 닫힘은 새 접속 시도의 실패라 평소 재접속 경로로 넘긴다.
      if (this.awaitingOldClose) {
        this.awaitingOldClose = false;
        return;
      }
      this.endRenewal();
    }
    this.clearRenewTimer();
    this.dropSubscriptions();

    if (this.manuallyDisconnected) {
      this.setState("disconnected");
      return;
    }

    // FORBIDDEN 은 역할 오분류 같은 설정 오류다 — 다시 붙어도 서버가 같은 이유로 4403 을 낸다. 무한 재시도로 "곧 복구될 문제"처럼
    // 보이게 하지 않고 멈춘다. 다시 시도하려면 `connect()` 를 명시적으로 다시 부른다.
    if (closeCode === CLOSE_SUBSCRIPTION_FORBIDDEN || this.state === "forbidden") {
      this.client?.deactivate().catch(() => {});
      this.setState("forbidden");
      return;
    }

    if (this.tokenExpired) {
      this.tokenExpired = false;
      this.startRefresh(false);
    } else if (this.unauthorized) {
      this.unauthorized = false;
      this.startRefresh(true);
    }
    if (!this.manuallyDisconnected) this.setState("reconnecting");
  }

  // 끊긴 뒤 재발급을 시작한다. 다음 접속 시도가 이 promise 를 기다린 뒤 새 토큰을 읽는다.
  // - 재발급이 거절되면(401) 세션 만료 — 다시 붙지 않는다.
  // - 망 오류 · 5xx · 시간 초과면 세션을 유지한 채 접속을 계속한다(stompjs 대기가 이어진다 — `Ruling 905`).
  // - UNAUTHORIZED 는 재발급을 한 번만 한다: 재발급한 토큰으로도 UNAUTHORIZED 면 세션 만료로 넘긴다.
  private startRefresh(afterUnauthorized: boolean): void {
    if (afterUnauthorized && this.refreshedAfterUnauthorized) {
      this.expireSession();
      return;
    }
    this.pendingRefresh = this.refreshAccessToken().then(
      () => {
        if (afterUnauthorized) this.refreshedAfterUnauthorized = true;
      },
      (failure: unknown) => {
        if (isRefreshRejected(failure)) {
          // 재발급을 기다리는 사이 화면이 떠났으면(disconnect) 세션 만료를 알리지 않는다.
          if (!this.manuallyDisconnected) this.expireSession();
        } else {
          this.onDebugMessage(`[AcademyRealtimeClient] 재발급 실패 — 세션은 유지하고 재접속을 계속한다: ${String(failure)}`);
        }
      },
    );
  }

  private expireSession(): void {
    this.manuallyDisconnected = true;
    this.client?.deactivate().catch(() => {});
    this.onSessionExpired();
    this.setState("disconnected");
  }

  // 접근 토큰 만료 [RENEW_LEAD_MS] 전에 재발급을 예약한다. 만료 시각을 못 읽는 토큰이면 예약하지 않는다 — 그때는 서버의 `TOKEN_EXPIRED` 경로가 받는다.
  private scheduleRenewal(token: string): void {
    this.clearRenewTimer();
    const expiresAt = readJwtExpiryMs(token);
    if (expiresAt === null) return;
    const delay = Math.max(expiresAt - Date.now() - RENEW_LEAD_MS, RENEW_MIN_DELAY_MS);
    this.renewTimer = setTimeout(() => void this.renewConnection(), delay);
  }

  // 재발급 → 연결을 닫고 새 토큰으로 다시 접속. 재발급이 실패하면 아무것도 바꾸지 않는다 — 연결은 그대로 두고, 만료 뒤 서버가 보내는
  // `TOKEN_EXPIRED` 가 끊김 경로를 태운다.
  private async renewConnection(): Promise<void> {
    this.renewTimer = null;
    const client = this.client;
    if (client === null || this.manuallyDisconnected || this.state !== "connected") return;
    try {
      await this.refreshAccessToken();
    } catch (failure) {
      this.onDebugMessage(`[AcademyRealtimeClient] 만료 전 재발급 실패 — 기존 연결을 유지한다: ${String(failure)}`);
      return;
    }
    // 재발급을 기다리는 사이 연결이 끊겼거나 닫혔으면 건드리지 않는다.
    if (this.manuallyDisconnected || this.client !== client || this.state !== "connected") return;
    this.renewing = true;
    this.awaitingOldClose = true;
    this.dropSubscriptions();
    this.renewGraceTimer = setTimeout(() => {
      if (!this.renewing) return;
      this.endRenewal();
      this.setState("reconnecting");
    }, RENEW_GRACE_MS);
    try {
      await client.deactivate();
    } catch {
      // 이미 닫힌 연결일 수 있다 — 닫으려던 것이니 무시한다.
    }
    if (!this.renewing || this.manuallyDisconnected || this.client !== client) return;
    client.activate();
  }

  private endRenewal(): void {
    this.renewing = false;
    this.awaitingOldClose = false;
    if (this.renewGraceTimer !== null) {
      clearTimeout(this.renewGraceTimer);
      this.renewGraceTimer = null;
    }
  }

  private clearRenewTimer(): void {
    if (this.renewTimer !== null) {
      clearTimeout(this.renewTimer);
      this.renewTimer = null;
    }
  }

  // 새 소켓은 이전 세션의 구독을 이어받지 않는다 — 호출부의 해제 함수는 소켓이 닫혔는지 보고 서버 해제를 건너뛴다.
  private dropSubscriptions(): void {
    for (const entry of this.subscriptions) entry.stale = true;
    this.subscriptions.clear();
  }

  private deliver(entry: ActiveSubscription, body: string): void {
    const parsed = parseWebSocketEnvelope(JSON.parse(body) as unknown);
    // 수신자 하나가 던져도 같은 방송을 받을 다른 수신자는 막지 않는다 — 구독을 나눠 쓰므로 한 화면의 오류가 다른 화면의 수신을 끊으면 안 된다.
    for (const listener of [...entry.listeners]) {
      try {
        listener.onEnvelope(parsed);
      } catch (failure) {
        this.onDebugMessage(`[AcademyRealtimeClient] 수신자 오류(${entry.destination}): ${String(failure)}`);
      }
    }
  }

  private setState(next: WsConnectionState): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
