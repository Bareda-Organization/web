import { describe, expect, it } from "vitest";
import { formatDateTime } from "./dateTime";

// R32-W9 — 목록 11곳 이상이 서버가 준 ISO 원문(`2026-09-12T08:00:00Z`)을 그대로 보여 줬다.
describe("formatDateTime", () => {
  it("UTC 시각은 브라우저 시간대와 무관하게 한국 시간으로 보여 준다", () => {
    expect(formatDateTime("2026-09-30T00:07:41Z")).toBe("2026-09-30 09:07");
    // 한국 시간으로는 다음 날 새벽 — 날짜가 함께 넘어간다.
    expect(formatDateTime("2026-09-30T16:30:00.123456Z")).toBe("2026-10-01 01:30");
  });

  it("오프셋이 붙은 시각도 한국 시간으로 바꾼다", () => {
    expect(formatDateTime("2026-09-30T09:07:00+09:00")).toBe("2026-09-30 09:07");
    expect(formatDateTime("2026-09-29T20:07:00-05:00")).toBe("2026-09-30 10:07");
  });

  it("시간대가 없는 값은 이미 한국 시간으로 보고 그대로 자리만 맞춘다", () => {
    expect(formatDateTime("2026-09-12T08:00:00")).toBe("2026-09-12 08:00");
  });

  it("날짜 없이 시각만 온 값은 시:분으로 보여 준다", () => {
    expect(formatDateTime("08:02")).toBe("08:02");
    expect(formatDateTime("08:02:30")).toBe("08:02");
  });

  it("값이 없거나 읽을 수 없으면 원문을 내지 않고 '-' 를 보여 준다", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime(undefined)).toBe("-");
    expect(formatDateTime("")).toBe("-");
    expect(formatDateTime("아무 문자열")).toBe("-");
  });
});
