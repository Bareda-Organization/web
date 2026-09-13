import { describe, expect, it } from "vitest";
import { parseWsEventType } from "./wsEventType";

describe("parseWsEventType", () => {
  it("학원·관리자 채널이 실제로 보내는 7종을 전부 인식한다", () => {
    const known = [
      "position",
      "stop_arrived",
      "rider_changed",
      "run_started",
      "run_ended",
      "emergency_raised",
      "approval_requested",
    ] as const;
    for (const value of known) {
      expect(parseWsEventType(value)).toBe(value);
    }
  });

  // Ruling 277 — emergency_acked 는 매니저 채널 전용으로 바뀌어 학원·관리자
  // 채널에는 오지 않는다. 여기서 알 수 없는 값으로 취급해야, 혹시 서버가
  // 실수로 이 이벤트를 잘못 방송해도 이 앱이 그것을 유효한 이벤트로 오인해
  // 없는 UI 를 그리려 하지 않는다.
  it("emergency_acked 는 모르는 값으로 취급한다 (Ruling 277)", () => {
    expect(parseWsEventType("emergency_acked")).toBeNull();
  });

  it("전혀 모르는 문자열·undefined 는 null 을 돌려준다", () => {
    expect(parseWsEventType("unknown_event")).toBeNull();
    expect(parseWsEventType(undefined)).toBeNull();
  });
});
