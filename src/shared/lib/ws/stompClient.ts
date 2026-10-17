import { Client, ReconnectionTimeMode, TickerStrategy } from "@stomp/stompjs";

// `@stomp/stompjs` 의 `Client` 를 이 파일이 정의하는 좁은 인터페이스로 감싼다.
// `AcademyRealtimeClient` 가 이 인터페이스에만 의존하게 하면, 단위 시험이 실제 WebSocket(jsdom 에 없다) 없이
// 가짜 구현을 주입해 재접속·FORBIDDEN·토큰 갱신 로직을 검증할 수 있다.

export type StompFrameLike = {
  headers: Record<string, string | undefined>;
  body: string;
};

export type StompMessageLike = {
  body: string;
};

export type StompCloseEventLike = {
  code?: number;
  reason?: string;
};

export type StompSubscriptionLike = {
  unsubscribe: () => void;
};

export type StompClientLike = {
  activate: () => void;
  deactivate: (options?: { force?: boolean }) => Promise<void>;
  subscribe: (destination: string, callback: (message: StompMessageLike) => void) => StompSubscriptionLike;
  readonly connected: boolean;
};

export type StompClientConfig = {
  brokerURL: string;
  // 연결 시도(첫 연결 · 자동 재접속)마다 stompjs 가 `beforeConnect` 에서 불러 그 시점의 CONNECT 헤더를 받는다 — 토큰을 시도마다 새로 읽는 자리.
  getConnectHeaders: () => Promise<Record<string, string>>;
  onConnect: (frame: StompFrameLike) => void;
  onStompError: (frame: StompFrameLike) => void;
  onWebSocketClose: (event: StompCloseEventLike) => void;
  onWebSocketError: (event: unknown) => void;
};

export type StompClientFactory = (config: StompClientConfig) => StompClientLike;

// STOMP 하트비트 간격 — 양방향 10000ms. 연결 감시·재연결 값 전체는 `docs/planning/API_SPEC.md §7.2` 표가 정하고 웹·Flutter(`baraeda_core`)가
// 같은 값을 쓴다. 서버 `WebSocketConfig.HEARTBEAT_MS` 도 10초라 협상 결과가 10초다 — 값을 바꾸면 그 표와 세 클라이언트를 같이 고친다.
const HEARTBEAT_MS = 10000;

// CONNECTED 프레임을 기다리는 한도(`API_SPEC §7.2`) — 소켓은 열렸는데 서버 응답이 안 오는 시도(인터넷 없는 Wi-Fi·서버 인바운드 포화)가
// OS 한도(수십~백 수십 초)까지 `connecting` 에 머물지 않게 한다. 넘으면 소켓을 닫고 `onWebSocketClose` → 백오프 재연결로 이어진다
// 3G 급 망에서도 10초면 핸드셰이크에 충분하다.
const CONNECTION_TIMEOUT_MS = 10000;

// 재접속 대기 — 첫 대기 1초에서 두 배씩 늘어 30초에서 멈춘다(`API_SPEC §7.2`). 포기 없이 계속 시도한다. 연결에 성공하면 1초로 돌아간다.
const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

// 실제 배포 환경에서 쓰는 기본 팩터리 — stompjs 내장 재접속(`reconnectDelay` · `reconnectTimeMode`)을 쓴다.
export const createStompClient: StompClientFactory = (config) => {
  const client = new Client({
    brokerURL: config.brokerURL,
    beforeConnect: async (self) => {
      self.connectHeaders = await config.getConnectHeaders();
    },
    reconnectDelay: RECONNECT_DELAY_MS,
    reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
    maxReconnectDelay: MAX_RECONNECT_DELAY_MS,
    heartbeatIncoming: HEARTBEAT_MS,
    heartbeatOutgoing: HEARTBEAT_MS,
    // 숨은 탭에서 `setInterval` 은 브라우저가 늦추므로(분당 1회 수준) 하트비트 송신이 서버 허용보다 드물게 나가 세션이 닫힌다.
    // 워커의 타이머는 늦춰지지 않는다(R46-FIXCONN C-1 ③).
    heartbeatStrategy: TickerStrategy.Worker,
    // 하트비트가 끊긴 소켓은 `close()` 의 종료 핸드셰이크를 기다리지 않고 버리고 바로 `onWebSocketClose`(코드 4001)를 낸다 —
    // 안 그러면 브라우저가 소켓을 닫기까지 수십 초가 더 걸려 재연결 예약이 그만큼 늦는다(C-3).
    discardWebsocketOnCommFailure: true,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    onConnect: (frame) => config.onConnect(frame),
    onStompError: (frame) => config.onStompError(frame),
    onWebSocketClose: (event) => config.onWebSocketClose(event as StompCloseEventLike),
    onWebSocketError: (event) => config.onWebSocketError(event),
  });
  return client;
};
