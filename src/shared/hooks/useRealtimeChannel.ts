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
  // 재연결을 포기(`gaveUp`)한 연결을 사용자가 다시 여는 창구 — 화면의 "다시 연결" 버튼용. 기본 재연결
  // 정책은 포기하지 않아 운영에서는 거의 쓰이지 않는다.
  reconnect: () => void;
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
  // 렌더 중 ref 를 직접 쓰지 않는다(`react-hooks/refs`) — 대신 매 렌더 뒤에 도는
  // effect 로 옮긴다. 이 값은 아래 두 번째 effect 가 만드는 구독 콜백(WebSocket
  // 메시지 수신 시에만, 비동기로 호출됨) 안에서만 읽으므로, 같은 커밋의 effect
  // 들이 전부 끝난 뒤에 갱신돼도 동작이 달라지지 않는다(판단 근거, 보고서 §1).
  useEffect(() => {
    onEnvelopeRef.current = onEnvelope;
  });

  useEffect(() => {
    const client = acquireClient();
    clientRef.current = client;
    // effect 본문에서 setState 를 직접 부르지 말라는 새 정적 검사
    // (`react-hooks/set-state-in-effect`)를 여기서는 따를 수 없다 — 위 주석이
    // 설명하듯 SSR 안전성 때문에 일부러 `useSyncExternalStore` 를 쓰지 않는
    // 설계이고, 이 줄이 하는 일이 바로 "외부 저장소(WebSocket 클라이언트)의
    // 지금 상태를 최초 동기화"라 미룰 대상이 없다(보고서 §1).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 연결 상태 동기화, 위 주석 참고
    setConnectionState(client.getSnapshot());
    const unsubscribeState = client.onConnectionStateChange(() => {
      setConnectionState(client.getSnapshot());
    });
    // 브라우저가 다시 온라인이 되거나 탭이 다시 보일 때, 끊겨 재연결 대기 중(`reconnecting`)이거나
    // 포기한(`gaveUp`) 연결을 다음 타이머(최대 30초)를 기다리지 않고 바로 다시 연다. 기본 재연결 정책은
    // 포기하지 않아(R46-FIXRT S-5) 운영에서는 `reconnecting` 이 이 경로를 탄다. 연결 중·연결된 연결은
    // 건드리지 않는다.
    const reopenIfStalled = () => {
      if (document.visibilityState === "hidden") return;
      const state = client.getSnapshot();
      if (state === "gaveUp" || state === "reconnecting") client.connect();
    };
    window.addEventListener("online", reopenIfStalled);
    document.addEventListener("visibilitychange", reopenIfStalled);
    return () => {
      window.removeEventListener("online", reopenIfStalled);
      document.removeEventListener("visibilitychange", reopenIfStalled);
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

  const reconnect = () => clientRef.current?.connect();

  return { connectionState, reconnect };
};
