import { describe, expect, it } from "vitest";
import { parseWebSocketEnvelope } from "./webSocketEnvelope";

describe("parseWebSocketEnvelope", () => {
  it("run_id 가 number 로 와도 string 으로 흡수한다 (Ruling 275)", () => {
    const envelope = parseWebSocketEnvelope({
      event: "position",
      run_id: 12,
      occurred_at: "2026-09-13T10:00:00Z",
      payload: { lat: 37.5 },
    });
    expect(envelope.runId).toBe("12");
    expect(typeof envelope.runId).toBe("string");
  });

  it("run_id 가 string 으로 와도 그대로 유지한다", () => {
    const envelope = parseWebSocketEnvelope({
      event: "position",
      run_id: "12",
      occurred_at: "2026-09-13T10:00:00Z",
      payload: {},
    });
    expect(envelope.runId).toBe("12");
  });

  it("아는 event 값은 그 리터럴로, 원문(eventWireValue)도 함께 보존한다", () => {
    const envelope = parseWebSocketEnvelope({
      event: "run_started",
      run_id: 1,
      occurred_at: "2026-09-13T10:00:00Z",
      payload: {},
    });
    expect(envelope.event).toBe("run_started");
    expect(envelope.eventWireValue).toBe("run_started");
  });

  it("모르는 event 값은 event 를 null 로 두되 원문은 보존한다", () => {
    const envelope = parseWebSocketEnvelope({
      event: "emergency_acked",
      run_id: 1,
      occurred_at: "2026-09-13T10:00:00Z",
      payload: {},
    });
    expect(envelope.event).toBeNull();
    expect(envelope.eventWireValue).toBe("emergency_acked");
  });

  it("occurred_at 은 Date 로 파싱하지 않고 원문 문자열 그대로 둔다", () => {
    const envelope = parseWebSocketEnvelope({
      event: "position",
      run_id: 1,
      occurred_at: "2026-09-13T10:00:00Z",
      payload: {},
    });
    expect(envelope.occurredAt).toBe("2026-09-13T10:00:00Z");
  });

  it("payload 가 객체가 아니면 빈 객체로 대체한다", () => {
    const envelope = parseWebSocketEnvelope({
      event: "position",
      run_id: 1,
      occurred_at: "2026-09-13T10:00:00Z",
      payload: null,
    });
    expect(envelope.payload).toEqual({});
  });
});
