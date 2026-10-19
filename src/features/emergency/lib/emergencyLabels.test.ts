import { describe, expect, it } from "vitest";
import { EMERGENCY_TYPE_LABEL, toEmergencyTypeLabel } from "./emergencyLabels";

// 비상 유형 이름은 사양(FEATURE_SPEC M-15 · USER_FLOWS UF-X-08)과 앱이 쓰는 「사고 · 차량 고장 · 학생 응급 · 기타」 그대로 화면에 낸다.
describe("emergencyLabels — 비상 유형 화면 이름", () => {
  it("학생 응급 유형은 「학생 응급」 으로 보이고 「응급상황」 글은 어느 유형에도 없다", () => {
    expect(EMERGENCY_TYPE_LABEL.student_emergency).toBe("학생 응급");
    expect(toEmergencyTypeLabel("student_emergency")).toBe("학생 응급");
    expect(Object.values(EMERGENCY_TYPE_LABEL).join("|")).not.toContain("응급상황");
  });

  it("사전에 없는 값은 영문 코드 대신 「비상 상황」 으로 보인다", () => {
    expect(toEmergencyTypeLabel("unknown_type")).toBe("비상 상황");
  });
});
