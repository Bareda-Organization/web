// 공개 창구 — 기능(`features/*`)과 `shared/hooks` 는 이 파일만 import 한다
// (`shared/lib/http/index.ts` 와 같은 관례).
export { asIdString } from "./asIdString";
export type { WsConnectionState } from "./wsConnectionState";
export { WsBackoffPolicy } from "./wsBackoffPolicy";
export type { WsBackoffPolicyOptions } from "./wsBackoffPolicy";
export { academyLiveDestination, adminLiveDestination } from "./wsChannel";
export { parseWsEventType } from "./wsEventType";
export type { WsEventType } from "./wsEventType";
export { parseWebSocketEnvelope } from "./webSocketEnvelope";
export type { WebSocketEnvelope } from "./webSocketEnvelope";
export {
  parseWsPositionPayload,
  parseWsStopArrivedPayload,
  parseWsRiderChangedPayload,
  parseWsRunStartedPayload,
  parseWsRunEndedPayload,
  parseWsEmergencyRaisedPayload,
  parseWsEmergencyCanceledPayload,
  parseWsApprovalRequestedPayload,
} from "./wsPayloads";
export type {
  WsPositionPayload,
  WsStopArrivedPayload,
  WsRiderChangedPayload,
  WsRunStartedPayload,
  WsRunEndedPayload,
  WsEmergencyRaisedBy,
  WsEmergencyPosition,
  WsEmergencyRaisedPayload,
  WsEmergencyCanceledPayload,
  WsApprovalRequestedPayload,
} from "./wsPayloads";
export { WS_BASE_URL } from "./wsUrl";
export { AcademyRealtimeClient } from "./academyRealtimeClient";
export type { AcademyRealtimeClientOptions } from "./academyRealtimeClient";
export { getWsConnectionNotice } from "./wsConnectionNotice";
export type { WsConnectionNotice } from "./wsConnectionNotice";
