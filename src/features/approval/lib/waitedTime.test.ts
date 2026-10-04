import { describe, expect, it } from "vitest";
import { formatWaited } from "./waitedTime";

describe("formatWaited — 신청 경과 시간", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  it.each([
    ["2026-10-03T11:59:30Z", "방금"],
    ["2026-10-03T11:48:00Z", "12분 전"],
    ["2026-10-03T07:00:00Z", "5시간 전"],
    ["2026-10-01T12:00:00Z", "2일 전"],
    ["2026-10-03T12:05:00Z", "방금"],
    ["not-a-date", ""],
  ])("%s → %s", (requestedAt, expected) => {
    expect(formatWaited(requestedAt, now)).toBe(expected);
  });
});
