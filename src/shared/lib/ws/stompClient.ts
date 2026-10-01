import { Client, TickerStrategy } from "@stomp/stompjs";

// `@stomp/stompjs` 의 `Client` 를 이 파일이 정의하는 좁은 인터페이스로 감싼다.
// `AcademyRealtimeClient` 가 이 인터페이스에만 의존하게 하면, 단위 시험이
// 실제 WebSocket(jsdom 에 없다) 없이 가짜 구현을 주입해 재연결·FORBIDDEN 처리
// 로직을 검증할 수 있다 — Dart 쪽은 `stomp_dart_client` 를 직접 물었지만 그
// 패키지의 시험은 실제 서버를 띄우는 통합 시험(`StompAuthChannelInterceptor`
// 대상)이었다. 이 앱은 그런 통합 시험 환경이 없어(Node/jsdom, 브라우저
// WebSocket 폴리필 부재) 어댑터 경계를 두는 쪽을 택했다 — 판단 근거, 보고서 §1.

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
  connectHeaders: Record<string, string>;
  onConnect: (frame: StompFrameLike) => void;
  onStompError: (frame: StompFrameLike) => void;
  onWebSocketClose: (event: StompCloseEventLike) => void;
  onWebSocketError: (event: unknown) => void;
};

export type StompClientFactory = (config: StompClientConfig) => StompClientLike;

// STOMP 하트비트 간격 — `docs/API_SPEC.md §7` 은 양방향 10000ms 를 못박는다.
// `baraeda_core` 의 `WsChannel`/`baraeda_websocket_client.dart` 도 같은 값을
// 쓰므로(백엔드가 세션당 고정 협상값을 기대) 이 값을 임의로 바꾸지 않는다.
const HEARTBEAT_MS = 10000;

// CONNECTED 프레임을 기다리는 한도 — 소켓은 열렸는데 서버 응답이 안 오는 시도(인터넷 없는 Wi-Fi·서버 인바운드 포화)가
// OS 한도(수십~백 수십 초)까지 `connecting` 에 머물지 않게 한다. 넘으면 소켓을 닫고 `onWebSocketClose` → 백오프 재연결로 이어진다
// (R46-FIXCONN C-4). 3G 급 망에서도 10초면 핸드셰이크에 충분하다.
const CONNECTION_TIMEOUT_MS = 10000;

// 실제 배포 환경에서 쓰는 기본 팩터리 — `reconnectDelay: 0` 으로 내장 재연결을
// 끈다. `WsBackoffPolicy` 가 계산한 지연으로 `AcademyRealtimeClient` 가 직접
// `setTimeout` 을 걸어 재연결한다(`wsBackoffPolicy.ts` 주석 참고) — Dart 쪽이
// `stomp_dart_client` 의 `reconnectDelay: Duration.zero` 로 같은 것을 한 이유와
// 동일하다: 내장 재연결은 포기(give-up) 조건이 없어 서버가 계속 꺼져 있어도
// 영원히 재시도한다.
export const createStompClient: StompClientFactory = (config) => {
  const client = new Client({
    brokerURL: config.brokerURL,
    connectHeaders: config.connectHeaders,
    reconnectDelay: 0,
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
