import type { WebSocketEnvelope } from "@/shared/lib/ws";

// 화면 시험이 `useRealtimeChannel` 가짜의 콜백에 흘려 넣는 방송 봉투 — 시험 전용(앱 코드는 부르지 않는다).
export const envelope = (
  event: WebSocketEnvelope["event"],
  payload: Record<string, unknown>,
  runId = "1",
): WebSocketEnvelope => ({
  event,
  eventWireValue: event ?? undefined,
  runId,
  occurredAt: "2026-09-13T00:00:00Z",
  payload,
});
