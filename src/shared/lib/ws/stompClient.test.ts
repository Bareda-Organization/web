import { TickerStrategy } from "@stomp/stompjs";
import { describe, expect, it } from "vitest";
import { createStompClient } from "./stompClient";

// `@stomp/stompjs` 의 `Client` 는 생성자에 준 값을 그대로 공개 프로퍼티로
// 들고 있다(`node_modules/@stomp/stompjs/esm6/client.js` 확인). 실제 소켓을
// 열지 않고도(=activate() 를 부르지 않고도) 그 프로퍼티를 읽어 하트비트·
// 내장 재연결 끔 설정이 그대로 전달됐는지 검사할 수 있다.
describe("createStompClient", () => {
  it("reconnectDelay 를 0 으로 둬 내장 재연결을 끈다 (AcademyRealtimeClient 가 직접 재연결한다)", () => {
    const client = createStompClient({
      brokerURL: "ws://localhost/ws/location",
      connectHeaders: {},
      onConnect: () => {},
      onStompError: () => {},
      onWebSocketClose: () => {},
      onWebSocketError: () => {},
    });
    expect((client as unknown as { reconnectDelay: number }).reconnectDelay).toBe(0);
  });

  it("하트비트를 양방향 10000ms 로 설정한다 (API_SPEC §7 고정값)", () => {
    const client = createStompClient({
      brokerURL: "ws://localhost/ws/location",
      connectHeaders: {},
      onConnect: () => {},
      onStompError: () => {},
      onWebSocketClose: () => {},
      onWebSocketError: () => {},
    });
    const raw = client as unknown as { heartbeatIncoming: number; heartbeatOutgoing: number };
    expect(raw.heartbeatIncoming).toBe(10000);
    expect(raw.heartbeatOutgoing).toBe(10000);
  });

  it("brokerURL·connectHeaders 를 그대로 전달한다", () => {
    const client = createStompClient({
      brokerURL: "ws://localhost/ws/location",
      connectHeaders: { Authorization: "Bearer t" },
      onConnect: () => {},
      onStompError: () => {},
      onWebSocketClose: () => {},
      onWebSocketError: () => {},
    });
    const raw = client as unknown as { brokerURL: string; connectHeaders: Record<string, string> };
    expect(raw.brokerURL).toBe("ws://localhost/ws/location");
    expect(raw.connectHeaders).toEqual({ Authorization: "Bearer t" });
  });
  // R46-FIXCONN C-1 ③·C-3·C-4 — 숨은 탭에서도 하트비트가 제때 나가고, 반쯤 죽은 연결·응답 없는 연결 시도가 바로 정리된다.
  it("하트비트는 Worker 로 보낸다 — 숨은 탭의 setInterval 스로틀로 서버가 세션을 닫지 않게", () => {
    const client = createStompClient({
      brokerURL: "ws://localhost/ws/location",
      connectHeaders: {},
      onConnect: () => {},
      onStompError: () => {},
      onWebSocketClose: () => {},
      onWebSocketError: () => {},
    });
    expect((client as unknown as { heartbeatStrategy: TickerStrategy }).heartbeatStrategy).toBe(TickerStrategy.Worker);
  });

  it("하트비트가 끊기면 소켓을 닫기를 기다리지 않고 버리고, CONNECTED 가 10초 안에 안 오면 시도를 끊는다", () => {
    const client = createStompClient({
      brokerURL: "ws://localhost/ws/location",
      connectHeaders: {},
      onConnect: () => {},
      onStompError: () => {},
      onWebSocketClose: () => {},
      onWebSocketError: () => {},
    });
    const raw = client as unknown as { discardWebsocketOnCommFailure: boolean; connectionTimeout: number };
    expect(raw.discardWebsocketOnCommFailure).toBe(true);
    expect(raw.connectionTimeout).toBe(10000);
  });
});
