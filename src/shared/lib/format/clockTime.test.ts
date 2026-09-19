import { describe, expect, it } from "vitest";
import { formatClockTime } from "./clockTime";

describe("formatClockTime", () => {
  it("같은 분 안의 초·밀리초 차이는 결과에 영향을 주지 않는다(시:분까지만 남긴다)", () => {
    // 실행 환경의 로컬 시간대에 좌우되지 않도록 "특정 문자열과 같다" 대신 "초 차이가
    // 결과를 바꾸지 않는다"를 검사한다 — 문자열을 그대로 박으면 CI 의 로컬 시간대가
    // 달라질 때 시험이 깨진다.
    expect(formatClockTime("2026-09-19T12:55:41.464829Z")).toBe(formatClockTime("2026-09-19T12:55:00.000000Z"));
  });

  it("분이 다르면 결과도 다르다", () => {
    expect(formatClockTime("2026-09-19T12:55:00Z")).not.toBe(formatClockTime("2026-09-19T12:56:00Z"));
  });

  it("이미 짧은 시각 문자열이면(Date 파싱 실패) 원본을 그대로 돌려준다", () => {
    expect(formatClockTime("08:10")).toBe("08:10");
  });
});
