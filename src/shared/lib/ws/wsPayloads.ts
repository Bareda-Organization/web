import { asIdString } from "./asIdString";

// `API_SPEC §7.1` 이벤트별 payload 파서. 봉투(`WebSocketEnvelope`)의 `payload` 는
// 원문 그대로 두고, 호출부가 `event` 값에 맞춰 여기 파서 중 하나로 다시 파싱한다
// — 이벤트마다 필드 모양이 전혀 달라 하나의 타입으로 합칠 수 없다(`baraeda_core`
// 의 `ws_payloads.dart` 와 같은 구조).
//
// id 필드(`stop_id` · `rider_id` · `student_id` · `emergency_id` · `run_id` ·
// `next_stop_id` · `approval_id`)는 전부 `asIdString` 을 거친다 — Ruling 275.
//
// 시각 필드(`received_at` · `arrived_at` · `changed_at` · `started_at` ·
// `finished_at` · `raised_at` · `deadline_at`)는 `webSocketEnvelope.ts` 의
// `occurredAt` 과 같은 이유로 `Date` 로 파싱하지 않고 원문 문자열 그대로 둔다 —
// DashboardPage · MonitoringPage 모두 지연·경과 시간을 서버가 계산해 준 필드로
// 표시하고, 화면에 노출하는 시각은 있는 그대로(포맷 없이) 보여주거나 아예
// 쓰지 않는다. 필요해지면 그 소비 지점에서 `new Date(value)` 로 파싱하면 되고,
// 여기서 미리 파싱해 실패 가능성만 늘릴 이유가 없다(판단 근거, 보고서 §1).
//
// `emergency_acked` 는 여기 없다 — `wsEventType.ts` 와 같은 이유(Ruling 277,
// 매니저 채널 전용)로 이 앱은 그 payload 를 소비하지 않는다.

export type WsPositionPayload = {
  lat: number;
  lng: number;
  receivedAt: string;
  currentStopName: string | null;
  // eta 의 구체 타입을 사양이 명시하지 않는다 — 값이 오면 원문 그대로 문자열로
  // 보존한다(`baraeda_core` 와 동일 판단).
  eta: string | null;
};

export const parseWsPositionPayload = (payload: Record<string, unknown>): WsPositionPayload => ({
  lat: Number(payload.lat),
  lng: Number(payload.lng),
  receivedAt: String(payload.received_at),
  currentStopName: payload.current_stop_name == null ? null : String(payload.current_stop_name),
  eta: payload.eta == null ? null : String(payload.eta),
});

export type WsStopArrivedPayload = {
  stopId: string;
  seq: number;
  name: string;
  arrivedAt: string;
  nextStopId: string | null;
};

export const parseWsStopArrivedPayload = (payload: Record<string, unknown>): WsStopArrivedPayload => ({
  stopId: asIdString(payload.stop_id),
  seq: Number(payload.seq),
  name: String(payload.name),
  arrivedAt: String(payload.arrived_at),
  nextStopId: payload.next_stop_id == null ? null : asIdString(payload.next_stop_id),
});

export type WsRiderChangedPayload = {
  riderId: string;
  studentId: string;
  studentName: string;
  // `RunRider.status` — waiting·boarded·alighted·absent·no_show (§9.4). enum
  // 화는 이 파서가 아니라 소비 화면 쪽 관심사다(`baraeda_core` 와 동일 판단).
  status: string;
  stopId: string;
  changedAt: string;
  counts: Record<string, unknown>;
  stopSkipped: boolean;
};

export const parseWsRiderChangedPayload = (payload: Record<string, unknown>): WsRiderChangedPayload => ({
  riderId: asIdString(payload.rider_id),
  studentId: asIdString(payload.student_id),
  studentName: String(payload.student_name),
  status: String(payload.status),
  stopId: asIdString(payload.stop_id),
  changedAt: String(payload.changed_at),
  counts: (payload.counts as Record<string, unknown>) ?? {},
  stopSkipped: Boolean(payload.stop_skipped),
});

export type WsRunStartedPayload = {
  runStatus: string;
  startedAt: string;
  autoBoardedCount: number;
};

export const parseWsRunStartedPayload = (payload: Record<string, unknown>): WsRunStartedPayload => ({
  runStatus: String(payload.run_status),
  startedAt: String(payload.started_at),
  autoBoardedCount: Number(payload.auto_boarded_count),
});

export type WsRunEndedPayload = {
  runStatus: string;
  finishedAt: string;
  autoAlightedCount: number;
};

export const parseWsRunEndedPayload = (payload: Record<string, unknown>): WsRunEndedPayload => ({
  runStatus: String(payload.run_status),
  finishedAt: String(payload.finished_at),
  autoAlightedCount: Number(payload.auto_alighted_count),
});

export type WsEmergencyRaisedBy = {
  name: string;
  role: string;
  phone: string;
};

const parseWsEmergencyRaisedBy = (value: Record<string, unknown>): WsEmergencyRaisedBy => ({
  name: String(value.name),
  role: String(value.role),
  phone: String(value.phone),
});

export type WsEmergencyPosition = {
  lat: number;
  lng: number;
};

const parseWsEmergencyPosition = (value: Record<string, unknown>): WsEmergencyPosition => ({
  lat: Number(value.lat),
  lng: Number(value.lng),
});

// `emergency_raised` — 관계자·메인 관리자 채널 전용(C-17).
export type WsEmergencyRaisedPayload = {
  emergencyId: string;
  // 그 회차의 학원 — 메인 관리자 배너가 어느 학원 신고인지 보이려고 싣는다(Ruling 395). 구 서버 응답이면 null.
  academyId: string | null;
  academyName: string | null;
  type: string;
  busNo: string;
  raisedBy: WsEmergencyRaisedBy;
  position: WsEmergencyPosition;
  riderCount: number;
  raisedAt: string;
};

export const parseWsEmergencyRaisedPayload = (payload: Record<string, unknown>): WsEmergencyRaisedPayload => ({
  emergencyId: asIdString(payload.emergency_id),
  academyId: payload.academy_id == null ? null : asIdString(payload.academy_id),
  academyName: payload.academy_name == null ? null : String(payload.academy_name),
  type: String(payload.type),
  busNo: String(payload.bus_no),
  raisedBy: parseWsEmergencyRaisedBy((payload.raised_by as Record<string, unknown>) ?? {}),
  position: parseWsEmergencyPosition((payload.position as Record<string, unknown>) ?? {}),
  // 발신 시점 회차에 배정된 라이더 전원 수 — 승하차 상태 무관.
  riderCount: Number(payload.rider_count),
  raisedAt: String(payload.raised_at),
});

// `emergency_canceled` — 관계자·메인 관리자 채널 전용. 발신 후 1분 안 취소
// (`DELETE /runs/{runId}/emergency/{id}`, §4.14) — `emergency_raised` 를 받은
// 화면이 같은 신고를 닫는 용도라 위치·발신자 등은 담지 않는다(`API_SPEC §7.1`).
export type WsEmergencyCanceledPayload = {
  emergencyId: string;
  busNo: string;
  canceledAt: string;
};

export const parseWsEmergencyCanceledPayload = (
  payload: Record<string, unknown>,
): WsEmergencyCanceledPayload => ({
  emergencyId: asIdString(payload.emergency_id),
  busNo: String(payload.bus_no),
  canceledAt: String(payload.canceled_at),
});

// `approval_requested` — 관계자 채널 전용(REQ-05). 관리자 채널에는 오지 않는다
// (`wsEventType.ts` 주석 · `docs/API_SPEC.md §7` 채널 표).
export type WsApprovalRequestedPayload = {
  approvalId: string;
  studentName: string;
  runId: string;
  stopName: string;
  deadlineAt: string;
};

export const parseWsApprovalRequestedPayload = (
  payload: Record<string, unknown>,
): WsApprovalRequestedPayload => ({
  approvalId: asIdString(payload.approval_id),
  studentName: String(payload.student_name),
  runId: asIdString(payload.run_id),
  stopName: String(payload.stop_name),
  deadlineAt: String(payload.deadline_at),
});
