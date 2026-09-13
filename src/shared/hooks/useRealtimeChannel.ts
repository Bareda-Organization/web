"use client";

import { useEffect, useRef, useState } from "react";
import { AcademyRealtimeClient, WS_BASE_URL, type WebSocketEnvelope, type WsConnectionState } from "../lib/ws";

type SharedConnection = {
  client: AcademyRealtimeClient;
  refCount: number;
};

// 모듈 단위 참조 계수 — React Strict Mode(개발 모드)가 effect 를 마운트→
// 언마운트→마운트로 두 번 태워도 실제 WebSocket 연결은 하나만 열리게 한다.
// `shared/lib/http/authGate.ts` 가 이미 쓰는 "공유 상태는 React context 가
// 아니라 모듈 변수" 관용구와 같은 형태다. 관계자·메인 관리자 화면은 항상
// 하나만 마운트되므로(역할이 갈라서 화면 자체가 다르다 — Goal 7·8), 이
// 변수가 가리키는 클라이언트는 한 번에 최대 하나다.
let shared: SharedConnection | null = null;

const acquireClient = (): AcademyRealtimeClient => {
  if (shared === null) {
    shared = { client: new AcademyRealtimeClient({ url: WS_BASE_URL }), refCount: 0 };
  }
  shared.refCount += 1;
  if (shared.refCount === 1) {
    shared.client.connect();
  }
  return shared.client;
};

const releaseClient = (): void => {
  if (shared === null) return;
  shared.refCount -= 1;
  if (shared.refCount <= 0) {
    shared.client.disconnect();
    shared = null;
  }
};

export type UseRealtimeChannelResult = {
  connectionState: WsConnectionState;
};

// `destination` 을 구독하고 봉투가 올 때마다 `onEnvelope` 를 부른다.
//
// 연결 자체(획득·`connect()`·`disconnect()`)와 목적지 구독을 별개의 effect 로
// 나눈다 — 연결은 컴포넌트 생명주기(마운트~언마운트)를 따르고, 구독은 연결
// 상태가 `connected` 로 바뀔 때마다(최초 연결 + 재연결 성공마다) 다시 걸어야
// 하기 때문이다. 재연결마다 서버 쪽 구독이 초기화되므로(새 STOMP 세션) 화면이
// 다시 구독하지 않으면 재연결 후 이벤트를 영영 못 받는다.
//
// `useSyncExternalStore` 대신 평범한 `useState`+`useEffect` 를 쓴다 — WebSocket
// 연결은 effect 안(`acquireClient()`)에서만 열리므로 Next.js 서버 렌더링 중에는
// 애초에 실행되지 않아 SSR 안전성 문제가 없고, "첫 effect 가 clientRef 를
// 채운 뒤에 두 번째 effect가 그 값을 읽는다"는 effect 호출 순서 하나에만
// 기대면 되어 `useSyncExternalStore` 의 `subscribe`/`getSnapshot` 재호출
// 타이밍을 따로 신경 쓸 필요가 없다(판단 근거, 보고서 §1).
export const useRealtimeChannel = (
  destination: string,
  onEnvelope: (envelope: WebSocketEnvelope) => void,
): UseRealtimeChannelResult => {
  const [connectionState, setConnectionState] = useState<WsConnectionState>("disconnected");
  const clientRef = useRef<AcademyRealtimeClient | null>(null);
  // 최신 콜백을 항상 반영하되, 이 값이 바뀌었다고 구독을 다시 걸지 않는다 —
  // 화면이 렌더될 때마다 새 함수 참조를 넘겨도(인라인 화살표 함수 등) 매번
  // 재구독하지 않게 하기 위함이다.
  const onEnvelopeRef = useRef(onEnvelope);
  onEnvelopeRef.current = onEnvelope;

  useEffect(() => {
    const client = acquireClient();
    clientRef.current = client;
    setConnectionState(client.getSnapshot());
    const unsubscribeState = client.onConnectionStateChange(() => {
      setConnectionState(client.getSnapshot());
    });
    return () => {
      unsubscribeState();
      clientRef.current = null;
      releaseClient();
    };
  }, []);

  useEffect(() => {
    if (connectionState !== "connected") return;
    const client = clientRef.current;
    if (client === null) return;
    const unsubscribe = client.subscribe(destination, (envelope) => onEnvelopeRef.current(envelope));
    return unsubscribe;
  }, [connectionState, destination]);

  return { connectionState };
};
