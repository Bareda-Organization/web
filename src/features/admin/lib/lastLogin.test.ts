import { describe, expect, it } from "vitest";
import { lastLoginText } from "./lastLogin";

const now = new Date("2026-10-03T12:45:00+09:00");

describe("lastLoginText", () => {
  it("오늘 · 어제는 말로, 그 밖은 월/일 시:분 (서울 기준)", () => {
    expect(lastLoginText("2026-10-03T12:21:00+09:00", now)).toBe("오늘 12:21");
    expect(lastLoginText("2026-10-02T23:59:00+09:00", now)).toBe("어제 23:59");
    expect(lastLoginText("2026-09-28T08:05:00+09:00", now)).toBe("9/28 08:05");
  });

  it("UTC 로 온 값도 서울 날짜로 가른다 — 03일 00:30(서울)은 02일 15:30Z", () => {
    expect(lastLoginText("2026-10-02T15:30:00Z", now)).toBe("오늘 00:30");
  });

  it("값이 없으면 로그인한 적이 없다", () => {
    expect(lastLoginText(null, now)).toBe("로그인 이력 없음");
  });
});
