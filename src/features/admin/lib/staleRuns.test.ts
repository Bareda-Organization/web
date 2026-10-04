import { describe, expect, it } from "vitest";
import { serviceDateLabel } from "./staleRuns";

describe("serviceDateLabel", () => {
  it("운행일을 월일 · 요일로, 지난 날수를 서울 날짜로 센다", () => {
    const now = new Date("2026-10-03T12:45:00+09:00");
    expect(serviceDateLabel("2026-09-29", now)).toEqual({ date: "9월 29일 (화)", days: 4 });
    expect(serviceDateLabel("2026-09-30", now)).toEqual({ date: "9월 30일 (수)", days: 3 });
  });

  it("서울 자정 직후(UTC 로는 전날)에도 날짜가 하루 밀리지 않는다", () => {
    const now = new Date("2026-10-02T15:10:00Z"); // 서울 10월 3일 00:10
    expect(serviceDateLabel("2026-10-01", now).days).toBe(2);
  });
});
