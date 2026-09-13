// `AcademyRealtimeClient` 의 연결 상태 — 화면이 배지·재연결 안내를 그리는 데 쓴다.
// `baraeda_core` 의 `WsConnectionState` enum(Dart) 과 같은 갈래를 두되, 여기 하나가
// 더 있다 — `forbidden`.
export type WsConnectionState =
  // 연결 시도 전, 또는 `disconnect()` 호출 이후 — 재연결 타이머도 없다.
  | "disconnected"
  // CONNECT 프레임을 보내고 서버 응답을 기다리는 중.
  | "connecting"
  // CONNECTED 프레임 수신 — 구독 호출이 가능한 유일한 상태.
  | "connected"
  // 연결이 끊겨 백오프 간격만큼 대기 중 — 자동으로 connecting 으로 넘어간다.
  | "reconnecting"
  // 재시도 횟수 상한 도달 — 더 이상 자동 재연결하지 않는다.
  | "gaveUp"
  // ⚠ Dart 쪽에는 없는 상태 — 이 앱은 화면 하나가 목적지 하나에 고정 구독하므로
  // (관계자=학원 채널, 메인 관리자=관리자 채널) 구독 거부(FORBIDDEN)는 "다른 목적지를
  // 골라 재시도"가 불가능하고 그 자체가 설정 오류·역할 오분류 신호다. 그래서 이
  // 상태를 화면이 구분해 그려야 한다(Goal 9 의 "연결 끊김"과는 다른 원인) — 서버가
  // 세션을 4403 으로 닫으므로 뒤이어 오는 재연결도 같은 사유로 계속 거부되고, 그
  // 무한 반복을 계속 disconnected/reconnecting 으로만 보여주면 사용자가 "곧 복구될
  // 문제"로 오인한다.
  | "forbidden";
