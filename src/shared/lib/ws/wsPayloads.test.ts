import { describe, expect, it } from "vitest";
import {
  parseWsApprovalRequestedPayload,
  parseWsEmergencyRaisedPayload,
  parseWsEmergencyCanceledPayload,
  parseWsPositionPayload,
} from "./wsPayloads";

describe("wsPayloads", () => {
  it("position — eta·current_stop_name 이 없으면 null 로 둔다", () => {
    const payload = parseWsPositionPayload({ lat: 37.5, lng: 127.1, received_at: "t", current_stop_name: null });
    expect(payload).toEqual({ lat: 37.5, lng: 127.1, receivedAt: "t", currentStopName: null, eta: null });
  });

  it("emergency_raised — emergency_id 를 흡수하고 raised_by·position 중첩을 파싱한다", () => {
    const payload = parseWsEmergencyRaisedPayload({
      emergency_id: 9,
      type: "accident",
      bus_no: "101",
      raised_by: { name: "기사", role: "driver", phone: "010" },
      position: { lat: 1, lng: 2 },
      rider_count: 5,
      raised_at: "t",
    });
    expect(payload.emergencyId).toBe("9");
    expect(payload.raisedBy).toEqual({ name: "기사", role: "driver", phone: "010" });
    expect(payload.position).toEqual({ lat: 1, lng: 2 });
  });

  it("emergency_canceled — emergency_id 를 흡수한다", () => {
    const payload = parseWsEmergencyCanceledPayload({
      emergency_id: 9,
      bus_no: "101",
      canceled_at: "t",
    });
    expect(payload).toEqual({ emergencyId: "9", busNo: "101", canceledAt: "t" });
  });

  it("approval_requested — approval_id·run_id 를 흡수한다", () => {
    const payload = parseWsApprovalRequestedPayload({
      approval_id: 7,
      student_name: "홍길동",
      run_id: 8,
      stop_name: "정문",
      deadline_at: "t",
    });
    expect(payload.approvalId).toBe("7");
    expect(payload.runId).toBe("8");
  });
});
