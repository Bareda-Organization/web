import { getAccessToken, refreshAccessToken as defaultRefreshAccessToken } from "../http";
import { ApiError } from "../http/apiError";
import { notifyAuthGate } from "../http/authGate";
import { readJwtExpiryMs } from "./jwtExpiry";
import { WsBackoffPolicy } from "./wsBackoffPolicy";
import type { WsConnectionState } from "./wsConnectionState";
import { parseWebSocketEnvelope, type WebSocketEnvelope } from "./webSocketEnvelope";
import {
  createStompClient,
  type StompClientConfig,
  type StompClientFactory,
  type StompClientLike,
  type StompFrameLike,
  type StompSubscriptionLike,
} from "./stompClient";

export type AcademyRealtimeClientOptions = {
  url: string;
  backoffPolicy?: WsBackoffPolicy;
  // 시험이 실제 WebSocket 없이 가짜 STOMP 클라이언트를 주입할 수 있게 하는
  // 자리 — `stompClient.ts` 상단 주석 참고.
  createClient?: StompClientFactory;
  readAccessToken?: () => string | null;
  // STOMP `ERROR` `TOKEN_EXPIRED` 를 받았을 때 부를 재발급 창구 — 기본값은
  // `refreshClient.ts` 의 동시 재발급을 1회로 묶는 그 함수다(REST 401 처리와
  // 같은 창구를 공유해야 refresh 토큰 1회용 회전과 부딪히지 않는다).
  refreshAccessToken?: () => Promise<string>;
  // 재발급까지 실패했을 때(refresh 토큰도 무효) 알릴 창구 — 기본값은 REST
  // 401 처리와 같은 `notifyAuthGate` 라 화면은 로그인 만료를 한 경로로만 받는다.
  onSessionExpired?: () => void;
  onDebugMessage?: (message: string) => void;
  // 재연결 대기의 지터를 뽑는 난수 — 시험이 고정값을 넣어 대기를 정확히 잰다. 기본은 `Math.random`.
  random?: () => number;
};

type ConnectionStateListener = () => void;

// 남의 학원 채널을 구독했을 때 서버가 STOMP ERROR `message` 헤더에 싣는 코드.
const SCOPE_VIOLATION_MESSAGE = "ACADEMY_SCOPE_VIOLATION";

// 접근 토큰 만료 이 시간 전에 새 토큰으로 두 번째 연결을 열어 갈아탄다(R46-LATERRT C-14 · `API_SPEC §7.2`). 클라이언트 시계가 서버보다
// 느리면 갈아타기가 만료 뒤로 밀리고, 그때는 기존 `TOKEN_EXPIRED` 재연결 경로가 받는다.
const RENEW_LEAD_MS = 60_000;
// 만료가 이미 임박했거나 수명이 짧은 토큰이어도 갈아타기를 이 간격보다 촘촘히 반복하지 않는다.
const RENEW_MIN_DELAY_MS = 5_000;
// 서버는 STOMP `RECEIPT` 를 보내지 않아(2026-10-01 실측) 구독 성공을 응답으로 알 수 없다 — 거부는 `ERROR`·닫힘으로만 드러난다.
// 새 연결에 구독을 모두 건 뒤 이 시간 동안 거부 신호가 없으면 확인된 것으로 보고 옛 연결을 닫는다.
const SUBSCRIBE_SETTLE_MS = 1_500;
// 옛 연결을 닫은 뒤에도 쌍둥이 방송이 새 연결로 늦게 도착할 수 있어 중복 거르기를 이 시간 더 유지한다.
const DEDUP_TAIL_MS = 5_000;

// `subscribe()` 가 받은 구독 한 건 — 갈아타기가 같은 구독을 새 연결에 다시 걸 수 있게 클라이언트가 직접 들고 있는다.
// `handles` 는 이 구독이 걸려 있는 연결(갈아타는 동안만 둘)과 그 연결에서 받은 해제 핸들이다.
type ActiveSubscription = {
  id: number;
  destination: string;
  onEnvelope: (envelope: WebSocketEnvelope) => void;
  handles: Map<StompClientLike, StompSubscriptionLike>;
};

// 갈아타려고 새로 연 두 번째 연결 — 옛 연결이 계속 방송을 받는 동안 구독을 모두 걸고 확인 대기가 끝나면 옛 연결을 대신한다.
type StandbyConnection = {
  attempt: number;
  client: StompClientLike;
  token: string;
  settleTimer: ReturnType<typeof setTimeout> | null;
};

// `/ws/location` 하나에 STOMP 로 붙는 클라이언트 — `baraeda_core` 의
// `BaraedaWebSocketClient`(Dart) 를 이 저장소가 웹에서도 쓸 수 있도록 옮긴
// 것이다(그 패키지 자체는 Flutter 전용이라 웹에서 재사용할 수 없다 —
// BRIEF-W.md §3). 완료 조건은 Dart 원본과 같다.
//
// 1. CONNECT 프레임 네이티브 헤더에 `Authorization: Bearer {token}` 을 싣는다
//    (토큰이 없으면 헤더 자체를 안 실어 서버의 401 거부를 그대로 노출한다).
// 2. 구독 거부(`FORBIDDEN`)를 감지하면 `WsConnectionState.forbidden` 으로
//    전이하고, Dart 와 달리 **재연결을 멈춘다**(`wsConnectionState.ts` 의
//    forbidden 상태 설명 참고 — 이 앱은 화면 하나가 목적지 하나에 고정
//    구독하므로 다른 목적지로 바꿔 재시도할 여지가 없다).
// 3. 끊기면 `WsBackoffPolicy` 로 계산한 간격(30초 상한 · 지터)만큼 대기했다가 자동 재연결한다 — 기본 정책은 포기하지 않는다.
// 4. 수신한 프레임을 `WebSocketEnvelope` 로 파싱해 넘긴다(id 흡수 포함).
//
// **구독 정리** — `subscribe()` 가 돌려주는 해제 함수를 호출부가 반드시
// 불러야 한다(Dart 의 `StompUnsubscribe` 와 같은 책임 분담 — 화면 생명주기는
// 이 클래스가 모른다).
export class AcademyRealtimeClient {
  private readonly url: string;
  private readonly backoffPolicy: WsBackoffPolicy;
  private readonly createClient: StompClientFactory;
  private readonly readAccessToken: () => string | null;
  private readonly refreshAccessToken: () => Promise<string>;
  private readonly onSessionExpired: () => void;
  private readonly onDebugMessage: (message: string) => void;

  private client: StompClientLike | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private manuallyDisconnected = true;
  private forbidden = false;
  // 이번 연결 시도 한 번에 대해 끊김 처리를 이미 했는지 — `onWebSocketError`
  // 와 `onWebSocketClose` 양쪽에서 불릴 수 있다(`baraeda_websocket_client.dart`
  // 의 `_reconnectHandled` 와 같은 사정: 소켓이 아예 안 열린 실패와 연결된
  // 뒤 끊긴 실패가 stompjs 에서도 다른 콜백으로 온다). 가드가 없으면 재연결
  // 스케줄이 두 번 걸려 타이머가 두 개 생긴다.
  private disconnectHandled = false;
  // 이번 연결이 끊긴 원인이 TOKEN_EXPIRED 였는지 — `handleStompError` 가
  // 세워 두면 뒤이어 오는 `handleDisconnected` 가 이 플래그를 보고 일반
  // 백오프 대신 재발급 경로(`handleTokenExpired`)를 탄다(Dart `_tokenExpired`
  // 와 같은 사정 — 재발급·재연결은 소켓이 실제로 닫힌 뒤에 시작해야 한다).
  private tokenExpired = false;

  private state: WsConnectionState = "disconnected";
  // 이번 연결에서 구독했지만 아직 해제하지 않은 목적지 — STOMP ERROR 프레임은
  // `destination` 헤더를 싣지 않으므로(Dart 쪽에서 실측 확인) 어느 구독이
  // 거부됐는지 이 목록으로 추론한다. `academy-web` 은 화면당 목적지가 항상
  // 하나뿐이라 모호함이 없다.
  private readonly random: () => number;
  private readonly pendingDestinations = new Set<string>();
  private readonly listeners = new Set<ConnectionStateListener>();

  // 연결 시도마다 오르는 번호표 — 갈아탄 옛 연결·밀려난 시도가 늦게 보내는 닫힘·오류 신호가 현재 연결을 끊김으로 오인하지 않게 한다
  // (`BaraedaWebSocketClient._attemptSeq` 와 같은 사정). `currentAttempt` 가 지금 방송을 받는 연결의 번호다.
  private attemptSeq = 0;
  private currentAttempt = 0;
  // 지금 걸려 있는 구독 전부 — 만료 전 갈아타기가 같은 구독을 새 연결에 옮기는 데 쓴다. 새 연결(재연결)은 구독을 이어받지 않으므로
  // `doConnect` 가 비운다(호출부가 `connected` 를 다시 받아 직접 구독한다).
  private readonly subscriptions = new Set<ActiveSubscription>();
  private subscriptionSeq = 0;
  private renewTimer: ReturnType<typeof setTimeout> | null = null;
  private standby: StandbyConnection | null = null;
  // 갈아타는 동안(과 그 직후) 본 방송 키 — 두 연결에서 같은 방송이 오면 한 번만 전달한다(`deliver`). null 이면 거르지 않는다.
  private seenDuringSwap: Set<string> | null = null;

  constructor(options: AcademyRealtimeClientOptions) {
    this.url = options.url;
    this.backoffPolicy = options.backoffPolicy ?? new WsBackoffPolicy();
    this.random = options.random ?? Math.random;
    this.createClient = options.createClient ?? createStompClient;
    this.readAccessToken = options.readAccessToken ?? getAccessToken;
    this.refreshAccessToken = options.refreshAccessToken ?? defaultRefreshAccessToken;
    this.onSessionExpired = options.onSessionExpired ?? (() => notifyAuthGate({ type: "session-expired" }));
    this.onDebugMessage = options.onDebugMessage ?? (() => {});
  }

  // `useSyncExternalStore` 의 `getSnapshot` 자리에 그대로 넘길 수 있게
  // 화살표 필드로 둔다 — 클래스 메서드를 훅에 넘기면 `this` 바인딩이
  // 호출부 문맥에 따라 갈릴 위험이 있다.
  getSnapshot = (): WsConnectionState => this.state;

  onConnectionStateChange = (listener: ConnectionStateListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // 연결을 시작한다. `forbidden`·`gaveUp` 상태에서 다시 호출하면 플래그와
  // 시도 횟수가 초기화되어 재시도가 재개된다.
  connect(): void {
    this.manuallyDisconnected = false;
    this.forbidden = false;
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
    this.doConnect();
  }

  // 재연결을 멈추고 연결을 닫는다. 화면 언마운트·로그아웃 시 호출한다.
  disconnect(): void {
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.cancelRenewal();
    this.client?.deactivate().catch(() => {
      // 서버가 FORBIDDEN 등으로 소켓을 이미 닫은 뒤에 deactivate() 를 부르면
      // 내부적으로 죽은 소켓에 쓰기를 시도해 예외가 날 수 있다(Dart 쪽
      // `StompBadStateException` 과 같은 사정) — "이미 끊긴 연결을 끊어라"
      // 는 요청이었으니 무시한다.
    });
    this.setState("disconnected");
  }

  // [destination] 을 구독하고, 프레임마다 파싱한 [WebSocketEnvelope] 를
  // [onEnvelope] 에 넘긴다. 반환값을 호출부가 언마운트 시 불러야 구독이
  // 해제된다. `connected` 상태가 아닐 때 부르면 던진다 — Dart 원본과 동일한
  // 계약이다.
  subscribe(destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void): () => void {
    const client = this.client;
    if (client === null || !client.connected) {
      throw new Error(
        `연결되지 않은 상태에서 subscribe(${destination}) 를 호출했다 — connected 상태가 된 뒤에 구독하라.`,
      );
    }
    this.pendingDestinations.add(destination);
    const entry: ActiveSubscription = { id: (this.subscriptionSeq += 1), destination, onEnvelope, handles: new Map() };
    this.subscriptions.add(entry);
    this.attachSubscription(client, entry);
    // 갈아타는 중이고 새 연결이 이미 열렸으면 새 연결에도 건다 — 안 그러면 옛 연결을 닫는 순간 이 구독이 사라진다.
    const standbyClient = this.standby?.client;
    if (standbyClient?.connected) this.attachSubscription(standbyClient, entry);
    return () => {
      this.subscriptions.delete(entry);
      this.pendingDestinations.delete(destination);
      for (const [owner, handle] of entry.handles) {
        // 소켓이 이미 닫혔으면 stompjs 의 unsubscribe() 가 `_checkConnection()` 에서
        // TypeError 를 던진다 — 재연결로 상태가 바뀔 때 effect 정리 단계가 이 함수를
        // 부르므로, 던지면 화면이 오류 경계로 떨어진다. 연결이 없으면 서버 쪽 구독도
        // 이미 사라졌으니 해제할 것이 없다.
        if (owner.connected) handle.unsubscribe();
      }
      entry.handles.clear();
    };
  }

  // [overrideToken] 을 주면 저장소를 다시 읽지 않고 그 값을 그대로 싣는다 —
  // 재발급 직후(`handleTokenExpired`)는 방금 받은 새 토큰이 손에 있는데
  // 저장소 왕복을 한 번 더 거칠 이유가 없다(Dart `_doConnect` 와 동일 판단).
  private doConnect(overrideToken?: string): void {
    this.cancelRenewal();
    this.disconnectHandled = false;
    // 새 소켓은 이전 세션의 구독을 이어받지 않는다 — 옛 목적지가 여기 남아
    // 있으면 다음 FORBIDDEN 이 이미 끊긴 목적지를 다시 가리키게 된다.
    this.pendingDestinations.clear();
    this.subscriptions.clear();
    this.setState("connecting");
    // 매 (재)연결마다 새로 읽는다 — REST 401 로 토큰이 갱신됐으면 다음
    // 재연결이 그 새 토큰을 자동으로 집는다(`BaraedaWebSocketClient` 클래스
    // 문서의 "토큰 만료 처리"와 동일한 판단).
    const token = overrideToken ?? this.readAccessToken();
    const attempt = (this.attemptSeq += 1);
    this.currentAttempt = attempt;
    this.client = this.createClient({
      brokerURL: this.url,
      connectHeaders: token === null ? {} : { Authorization: `Bearer ${token}` },
      ...this.connectionHandlers(attempt, token),
    });
    this.client.activate();
  }

  // 연결 하나(첫 연결·재연결·갈아타려고 연 두 번째 연결)의 STOMP 콜백. 번호표(`attempt`)로 이 연결이 지금 누구 몫인지 가른다 —
  // 지금 방송을 받는 연결이면 연결 상태 처리, 갈아타려고 연 연결이면 갈아타기 진행·실패 처리, 둘 다 아니면(밀려난 옛 연결) 무시한다.
  private connectionHandlers(
    attempt: number,
    token: string | null,
  ): Pick<StompClientConfig, "onConnect" | "onStompError" | "onWebSocketClose" | "onWebSocketError"> {
    const isCurrent = () => attempt === this.currentAttempt;
    const isStandby = () => this.standby?.attempt === attempt;
    const failStandby = (reason: string) => {
      this.onDebugMessage(`[AcademyRealtimeClient] 만료 전 갈아타기 실패(${reason}) — 기존 연결을 유지한다`);
      this.abortStandby();
    };
    return {
      onConnect: () => {
        if (isStandby()) {
          this.onStandbyConnected();
          return;
        }
        if (!isCurrent()) return;
        this.reconnectAttempt = 0;
        this.setState("connected");
        if (token !== null) this.scheduleRenewal(token);
      },
      onStompError: (frame) => {
        if (isStandby()) failStandby(`STOMP ERROR ${frame.headers.message ?? ""}`);
        else if (isCurrent()) this.handleStompError(frame);
      },
      onWebSocketClose: () => {
        if (isStandby()) failStandby("연결 닫힘");
        else if (isCurrent()) this.handleDisconnected();
      },
      onWebSocketError: (event) => {
        this.onDebugMessage(`[AcademyRealtimeClient] WebSocket error: ${String(event)}`);
        if (isStandby()) failStandby("WebSocket 오류");
        else if (isCurrent()) this.handleDisconnected();
      },
    };
  }

  private handleStompError(frame: StompFrameLike): void {
    const message = frame.headers.message;
    // `StompAuthChannelInterceptor` 의 SUBSCRIBE 거부 경로는 전부
    // `BusinessException(ErrorCode.FORBIDDEN)` 을 던진다 — 이 문자열과, 남의
    // 학원 채널을 구독했을 때의 `ACADEMY_SCOPE_VIOLATION` 이 구독 거부를
    // 나타내는 값이다(후자는 `wsRealBackendAuth.test.ts` 가 실서버로 확인).
    if (message === "FORBIDDEN" || message === SCOPE_VIOLATION_MESSAGE) {
      this.forbidden = true;
      this.setState("forbidden");
    }
    // API_SPEC §7 — 연결에 쓰인 access 토큰이 만료되면 서버가 이 프레임으로
    // 세션을 닫는다. 실제 재발급·재연결은 뒤이어 오는 `handleDisconnected` 가
    // 이 플래그를 보고 처리한다 — 서버가 소켓을 닫는 시점과 순서를 맞추기
    // 위해 여기서 바로 재발급을 시작하지 않는다(Dart 원본과 동일 근거).
    if (message === "TOKEN_EXPIRED") {
      this.tokenExpired = true;
    }
    this.onDebugMessage(`[AcademyRealtimeClient] STOMP ERROR: ${JSON.stringify(frame.headers)} ${frame.body}`);
  }

  private handleDisconnected(): void {
    if (this.disconnectHandled) return;
    this.disconnectHandled = true;
    this.cancelRenewal();

    if (this.manuallyDisconnected) {
      this.setState("disconnected");
      return;
    }

    // FORBIDDEN 은 역할 오분류 같은 설정 오류다 — 같은 목적지를 재구독해도
    // 서버가 같은 이유로 다시 4403 을 낸다. 무한 재시도로 "곧 복구될
    // 문제"처럼 보이게 하지 않고 여기서 멈춘다. 다시 시도하려면 `connect()`
    // 를 명시적으로 다시 호출해야 한다(그 안에서 이 플래그가 초기화된다).
    if (this.forbidden) {
      this.setState("forbidden");
      return;
    }

    if (this.tokenExpired) {
      this.tokenExpired = false;
      void this.handleTokenExpired();
      return;
    }

    this.scheduleReconnect();
  }

  // 백오프 횟수를 하나 쓰고 다음 재연결을 예약한다 — 정책에 상한이 있고 닿으면 `gaveUp`(기본 정책은 상한이 없다).
  private scheduleReconnect(): void {
    this.reconnectAttempt += 1;
    if (this.backoffPolicy.shouldGiveUp(this.reconnectAttempt)) {
      this.setState("gaveUp");
      return;
    }

    this.setState("reconnecting");
    const delay = this.backoffPolicy.jitteredDelayFor(this.reconnectAttempt, this.random);
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
  }

  // TOKEN_EXPIRED 로 끊긴 뒤의 처리 — 재발급에 성공하면 곧바로 새 토큰으로
  // 재연결하고(백오프 횟수를 소모하지 않는다 — 예정된 갱신이지 네트워크
  // 실패가 아니다), 재발급이 401 로 거절되면 `gaveUp` 이 아니라 로그인 만료로 넘긴다(같은
  // 토큰으로 재시도해 봐야 다시 거부되므로 "재시도"가 뜻을 잃는다).
  private async handleTokenExpired(): Promise<void> {
    this.setState("reconnecting");
    let newToken: string;
    try {
      newToken = await this.refreshAccessToken();
    } catch (failure) {
      // 재발급이 401 로 거절돼야 refresh 토큰이 무효라는 뜻이다 — 네트워크 오류·5xx
      // 는 일시적일 수 있으니 로그인 만료로 넘기지 않고 일반 재연결 경로를 탄다.
      if (failure instanceof ApiError && failure.status === 401) {
        this.onSessionExpired();
        this.setState("disconnected");
      } else if (!this.manuallyDisconnected) {
        this.scheduleReconnect();
      }
      return;
    }
    // 재발급을 기다리는 사이 화면이 떠났으면(disconnect) 새 소켓을 열지 않는다 —
    // 열면 아무도 닫지 못하는 소켓이 남는다.
    if (this.manuallyDisconnected) return;
    this.reconnectAttempt = 0;
    this.doConnect(newToken);
  }

  // 접근 토큰 만료 [RENEW_LEAD_MS] 전에 갈아타기를 예약한다. 만료 시각을 못 읽는 토큰이면 예약하지 않는다 — 그때는 기존
  // `TOKEN_EXPIRED` 경로가 받는다. 갈아탄 뒤에는 새 토큰의 만료 시각으로 다시 예약한다.
  private scheduleRenewal(token: string): void {
    this.clearRenewTimer();
    const expiresAt = readJwtExpiryMs(token);
    if (expiresAt === null) return;
    const delay = Math.max(expiresAt - Date.now() - RENEW_LEAD_MS, RENEW_MIN_DELAY_MS);
    this.renewTimer = setTimeout(() => void this.renewConnection(), delay);
  }

  // 재발급 → 새 토큰으로 두 번째 연결. 재발급이 실패하면 아무것도 바꾸지 않는다 — 연결은 그대로 두고, 만료 뒤 서버가 보내는
  // `TOKEN_EXPIRED` 가 기존 재발급·재연결 경로를 태운다(방송 공백은 이 기능이 없을 때와 같다).
  private async renewConnection(): Promise<void> {
    this.renewTimer = null;
    const attempt = this.currentAttempt;
    if (this.manuallyDisconnected || this.state !== "connected") return;
    let newToken: string;
    try {
      newToken = await this.refreshAccessToken();
    } catch (failure) {
      this.onDebugMessage(`[AcademyRealtimeClient] 만료 전 재발급 실패 — 기존 연결을 유지한다: ${String(failure)}`);
      return;
    }
    // 재발급을 기다리는 사이 연결이 끊겼거나 바뀌었으면(끊김·종료·재연결) 갈아타지 않는다.
    if (this.manuallyDisconnected || attempt !== this.currentAttempt || this.state !== "connected") return;
    this.openStandby(newToken);
  }

  private openStandby(token: string): void {
    const attempt = (this.attemptSeq += 1);
    const client = this.createClient({
      brokerURL: this.url,
      connectHeaders: { Authorization: `Bearer ${token}` },
      ...this.connectionHandlers(attempt, token),
    });
    this.standby = { attempt, client, token, settleTimer: null };
    client.activate();
  }

  // 두 번째 연결이 `CONNECTED` 를 받았다 — 걸려 있는 구독을 모두 새 연결에 걸고, 확인 대기가 끝나면 옛 연결을 닫는다.
  private onStandbyConnected(): void {
    const standby = this.standby;
    if (standby === null) return;
    this.seenDuringSwap = new Set();
    for (const entry of this.subscriptions) this.attachSubscription(standby.client, entry);
    standby.settleTimer = setTimeout(() => this.promoteStandby(), SUBSCRIBE_SETTLE_MS);
  }

  // 확인 대기 동안 거부 신호가 없었다 — 새 연결이 방송 받는 연결이 되고 옛 연결을 닫는다. 연결 상태는 `connected` 그대로라
  // 알림도 보내지 않는다(연결 띠·배너가 갈아타는 동안 깜빡이지 않는다).
  private promoteStandby(): void {
    const standby = this.standby;
    const previous = this.client;
    if (standby === null || previous === null) return;
    this.standby = null;
    this.client = standby.client;
    this.currentAttempt = standby.attempt;
    for (const entry of this.subscriptions) entry.handles.delete(previous);
    previous.deactivate().catch(() => {
      // 옛 연결이 이미 닫혀 있을 수 있다 — 닫으려던 것이니 무시한다([disconnect] 와 같은 사정).
    });
    const seen = this.seenDuringSwap;
    setTimeout(() => {
      if (this.seenDuringSwap === seen) this.seenDuringSwap = null;
    }, DEDUP_TAIL_MS);
    this.scheduleRenewal(standby.token);
  }

  // 갈아타기를 접고 두 번째 연결만 닫는다 — 옛 연결은 건드리지 않는다.
  private abortStandby(): void {
    const standby = this.standby;
    if (standby === null) return;
    this.standby = null;
    this.seenDuringSwap = null;
    if (standby.settleTimer !== null) clearTimeout(standby.settleTimer);
    for (const entry of this.subscriptions) entry.handles.delete(standby.client);
    standby.client.deactivate().catch(() => {
      // 이미 닫힌 연결을 다시 닫으려는 경우 — 무시한다.
    });
  }

  private clearRenewTimer(): void {
    if (this.renewTimer !== null) {
      clearTimeout(this.renewTimer);
      this.renewTimer = null;
    }
  }

  // 예약된 갈아타기와 진행 중인 갈아타기를 모두 접는다 — 연결이 끊기거나 새로 시작되거나 닫힐 때.
  private cancelRenewal(): void {
    this.clearRenewTimer();
    this.abortStandby();
  }

  // [client] 에 구독을 걸고 해제 핸들을 구독 기록에 남긴다. 밀려난 연결(갈아타고 닫힌 옛 연결)이 늦게 보내는 프레임은 버린다.
  private attachSubscription(client: StompClientLike, entry: ActiveSubscription): void {
    const handle = client.subscribe(entry.destination, (message) => {
      if (client !== this.client && client !== this.standby?.client) return;
      this.deliver(entry, message.body);
    });
    entry.handles.set(client, handle);
  }

  // 갈아타는 동안 같은 방송이 두 연결에서 오면 한 번만 넘긴다. 방송 본문에 고유 식별자가 없고 STOMP `message-id` 는 세션마다
  // 따로 붙으므로(`Ruling 682`) (구독 + 원문 본문)으로 가린다 — 서버는 같은 방송을 같은 바이트로 모든 구독자에게 보낸다.
  private deliver(entry: ActiveSubscription, body: string): void {
    const seen = this.seenDuringSwap;
    if (seen !== null) {
      const key = `${entry.id}\n${body}`;
      if (seen.has(key)) return;
      seen.add(key);
    }
    entry.onEnvelope(parseWebSocketEnvelope(JSON.parse(body) as unknown));
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(next: WsConnectionState): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
