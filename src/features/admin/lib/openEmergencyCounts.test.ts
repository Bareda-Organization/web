import { describe, expect, it } from "vitest";
import { countOpenEmergenciesByAcademy } from "./openEmergencyCounts";

const item = (academyId: string, academyName: string, extra: Partial<{ staffAcked: boolean; canceledAt: string | null }> = {}) => ({
  academy: { id: academyId, name: academyName },
  staffAcked: false,
  canceledAt: null,
  ...extra,
});

// B1 #24 — 13개 학원 중 어디에 비상이 있는지 한눈에 보려면 학원별 미확인 건수가 필요하다.
describe("countOpenEmergenciesByAcademy", () => {
  it("관계자가 아직 확인하지 않은 비상만 학원별로 센다", () => {
    const counts = countOpenEmergenciesByAcademy([
      item("1", "강동"),
      item("1", "강동"),
      item("2", "송파"),
      item("2", "송파", { staffAcked: true }),
    ]);

    expect(counts).toEqual({ "1": 2, "2": 1 });
  });

  it("취소된 비상은 세지 않는다", () => {
    expect(countOpenEmergenciesByAcademy([item("1", "강동", { canceledAt: "2026-10-01T09:00:00+09:00" })])).toEqual({});
  });
});
