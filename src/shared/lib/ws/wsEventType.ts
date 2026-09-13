// `API_SPEC §7` 공통 봉투의 `event` 필드 — 이 앱이 구독하는 두 채널이 방송하는
// 이벤트 전부(학원 채널 7종, 관리자 채널은 그중 approval_requested 를 뺀 6종 —
// `docs/API_SPEC.md §7` 채널 표, BRIEF-W.md 항목 7·8).
//
// ⚠ `emergency_acked` 는 여기 없다 — Ruling 277(커밋 19b9c5f5·caeddb8c)로 매니저
// 채널 전용으로 바뀌었고, 학원·관리자 채널에는 원래도 오지 않는다. `baraeda_core`
// 의 `WsEventType`(Dart) 은 매니저 채널도 서비스하므로 그 값을 여전히 갖고 있지만,
// 이 앱은 학원·관리자 채널만 구독하므로 포함하지 않는다 — 판단 근거, 보고서 §1.
export type WsEventType =
  | "position"
  | "stop_arrived"
  | "rider_changed"
  | "run_started"
  | "run_ended"
  | "emergency_raised"
  | "approval_requested";

const KNOWN_EVENT_TYPES: readonly WsEventType[] = [
  "position",
  "stop_arrived",
  "rider_changed",
  "run_started",
  "run_ended",
  "emergency_raised",
  "approval_requested",
];

// 모르는 값이면 `null` — 서버가 이벤트를 추가해도 파싱 자체는 죽지 않고, 이
// 계층에서 "미지 이벤트"로 갈라져 호출부가 무시하거나 로그만 남길 수 있다
// (`WebSocketEnvelope.eventWireValue` 가 원문을 보존한다).
export const parseWsEventType = (value: string | undefined): WsEventType | null => {
  const match = KNOWN_EVENT_TYPES.find((known) => known === value);
  return match ?? null;
};
