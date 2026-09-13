import { asIdString } from "./asIdString";
import { parseWsEventType, type WsEventType } from "./wsEventType";

// `API_SPEC §7` 공통 봉투. 표는 `run_id` 를 `string` 으로 문서화하지만 실제 서버
// `WebSocketEnvelope.java` 는 `Long runId` 를 그대로 내보낸다(Ruling 275) —
// `asIdString` 을 거쳐 흡수하고, `payload` 는 원문 그대로 둔 채 호출부가 `event` 에
// 맞는 `wsPayloads.ts` 의 파서로 다시 파싱한다(그 파싱도 안의 id 필드마다 같은
// 흡수를 거친다).
//
// `baraeda_core` 의 `WebSocketEnvelope`(Dart) 와 달리 `occurredAt` 을 `Date` 로
// 파싱하지 않고 원문 문자열 그대로 둔다 — 이 앱의 소비 화면(DashboardPage ·
// MonitoringPage)은 지연·경과 시간을 클라이언트에서 계산하지 않고 서버가 이미
// 계산해 준 필드(`delayMinutes` 등)를 그대로 표시하므로, `occurredAt` 은 화면에
// 노출조차 되지 않는다 — 파싱 실패 가능성(타임존·포맷 오류)만 늘리는 변환을
// 소비하지 않을 값에 미리 적용할 이유가 없다(판단 근거, 보고서 §1).
export type WebSocketEnvelope = {
  event: WsEventType | null;
  eventWireValue: string | undefined;
  runId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export const parseWebSocketEnvelope = (json: unknown): WebSocketEnvelope => {
  const record = (json ?? {}) as Record<string, unknown>;
  const wireValue = typeof record.event === "string" ? record.event : undefined;
  const payload = record.payload;
  return {
    event: parseWsEventType(wireValue),
    eventWireValue: wireValue,
    runId: asIdString(record.run_id),
    occurredAt: String(record.occurred_at),
    payload: payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {},
  };
};
