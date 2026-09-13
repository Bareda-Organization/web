import { getAccessToken } from "../http";
import { WsBackoffPolicy } from "./wsBackoffPolicy";
import type { WsConnectionState } from "./wsConnectionState";
import { parseWebSocketEnvelope, type WebSocketEnvelope } from "./webSocketEnvelope";
import {
  createStompClient,
  type StompClientFactory,
  type StompClientLike,
  type StompFrameLike,
} from "./stompClient";

export type AcademyRealtimeClientOptions = {
  url: string;
  backoffPolicy?: WsBackoffPolicy;
  // 시험이 실제 WebSocket 없이 가짜 STOMP 클라이언트를 주입할 수 있게 하는
  // 자리 — `stompClient.ts` 상단 주석 참고.
  createClient?: StompClientFactory;
  readAccessToken?: () => string | null;
  onDebugMessage?: (message: string) => void;
};

type ConnectionStateListener = () => void;

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
// 3. 끊기면 `WsBackoffPolicy` 로 계산한 간격만큼 대기했다가 자동 재연결한다.
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

  private state: WsConnectionState = "disconnected";
  // 이번 연결에서 구독했지만 아직 해제하지 않은 목적지 — STOMP ERROR 프레임은
  // `destination` 헤더를 싣지 않으므로(Dart 쪽에서 실측 확인) 어느 구독이
  // 거부됐는지 이 목록으로 추론한다. `academy-web` 은 화면당 목적지가 항상
  // 하나뿐이라 모호함이 없다.
  private readonly pendingDestinations = new Set<string>();
  private readonly listeners = new Set<ConnectionStateListener>();

  constructor(options: AcademyRealtimeClientOptions) {
    this.url = options.url;
    this.backoffPolicy = options.backoffPolicy ?? new WsBackoffPolicy();
    this.createClient = options.createClient ?? createStompClient;
    this.readAccessToken = options.readAccessToken ?? getAccessToken;
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
    const subscription = client.subscribe(destination, (message) => {
      const json = JSON.parse(message.body) as unknown;
      onEnvelope(parseWebSocketEnvelope(json));
    });
    return () => {
      this.pendingDestinations.delete(destination);
      subscription.unsubscribe();
    };
  }

  private doConnect(): void {
    this.disconnectHandled = false;
    // 새 소켓은 이전 세션의 구독을 이어받지 않는다 — 옛 목적지가 여기 남아
    // 있으면 다음 FORBIDDEN 이 이미 끊긴 목적지를 다시 가리키게 된다.
    this.pendingDestinations.clear();
    this.setState("connecting");
    // 매 (재)연결마다 새로 읽는다 — REST 401 로 토큰이 갱신됐으면 다음
    // 재연결이 그 새 토큰을 자동으로 집는다(`BaraedaWebSocketClient` 클래스
    // 문서의 "토큰 만료 처리"와 동일한 판단).
    const token = this.readAccessToken();
    this.client = this.createClient({
      brokerURL: this.url,
      connectHeaders: token === null ? {} : { Authorization: `Bearer ${token}` },
      onConnect: () => {
        this.reconnectAttempt = 0;
        this.setState("connected");
      },
      onStompError: (frame) => this.handleStompError(frame),
      onWebSocketClose: () => this.handleDisconnected(),
      onWebSocketError: (event) => {
        this.onDebugMessage(`[AcademyRealtimeClient] WebSocket error: ${String(event)}`);
        this.handleDisconnected();
      },
    });
    this.client.activate();
  }

  private handleStompError(frame: StompFrameLike): void {
    const message = frame.headers.message;
    // `StompAuthChannelInterceptor` 의 SUBSCRIBE 거부 경로는 전부
    // `BusinessException(ErrorCode.FORBIDDEN)` 을 던진다 — 이 문자열이
    // 구독 거부를 나타내는 유일한 값이다(Dart 원본과 동일 근거).
    if (message === "FORBIDDEN") {
      this.forbidden = true;
      this.setState("forbidden");
    }
    this.onDebugMessage(`[AcademyRealtimeClient] STOMP ERROR: ${JSON.stringify(frame.headers)} ${frame.body}`);
  }

  private handleDisconnected(): void {
    if (this.disconnectHandled) return;
    this.disconnectHandled = true;

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

    this.reconnectAttempt += 1;
    if (this.backoffPolicy.shouldGiveUp(this.reconnectAttempt)) {
      this.setState("gaveUp");
      return;
    }

    this.setState("reconnecting");
    const delay = this.backoffPolicy.delayFor(this.reconnectAttempt);
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
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
