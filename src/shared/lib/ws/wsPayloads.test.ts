import { describe, expect, it } from "vitest";
import {
  parseWsApprovalRequestedPayload,
  parseWsEmergencyRaisedPayload,
  parseWsEmergencyCanceledPayload,
  parseWsPositionPayload,
  parseWsRiderChangedPayload,
  parseWsRunEndedPayload,
  parseWsRunStartedPayload,
  parseWsStopArrivedPayload,
} from "./wsPayloads";

describe("wsPayloads", () => {
  it("position — eta·current_stop_name 이 없으면 null 로 둔다", () => {
    const payload = parseWsPositionPayload({ lat: 37.5, lng: 127.1, received_at: "t", current_stop_name: null });
    expect(payload).toEqual({ lat: 37.5, lng: 127.1, receivedAt: "t", currentStopName: null, eta: null });
  });

  it("stop_arrived — next_stop_id 를 asIdString 으로 흡수하고, null 이면 null 그대로", () => {
    const withNext = parseWsStopArrivedPayload({
      stop_id: 5,
      seq: 2,
      name: "정문",
      arrived_at: "t",
      next_stop_id: 6,
    });
    expect(withNext.stopId).toBe("5");
    expect(withNext.nextStopId).toBe("6");

    const last = parseWsStopArrivedPayload({
      stop_id: 5,
      seq: 2,
      name: "정문",
      arrived_at: "t",
      next_stop_id: null,
    });
    expect(last.nextStopId).toBeNull();
  });

  it("rider_changed — rider_id·student_id·stop_id 전부 흡수한다", () => {
    const payload = parseWsRiderChangedPayload({
      rider_id: 1,
      student_id: 2,
      student_name: "홍길동",
      status: "boarded",
      stop_id: 3,
      changed_at: "t",
      counts: { boarded: 1 },
      stop_skipped: false,
    });
    expect(payload.riderId).toBe("1");
    expect(payload.studentId).toBe("2");
    expect(payload.stopId).toBe("3");
    expect(payload.counts).toEqual({ boarded: 1 });
  });

  it("run_started — run_status 를 그대로 옮긴다", () => {
    const payload = parseWsRunStartedPayload({ run_status: "moving", started_at: "t", auto_boarded_count: 3 });
    expect(payload).toEqual({ runStatus: "moving", startedAt: "t", autoBoardedCount: 3 });
  });

  it("run_ended — run_status 를 그대로 옮긴다", () => {
    const payload = parseWsRunEndedPayload({ run_status: "finished", finished_at: "t", auto_alighted_count: 4 });
    expect(payload).toEqual({ runStatus: "finished", finishedAt: "t", autoAlightedCount: 4 });
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
