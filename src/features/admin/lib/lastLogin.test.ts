import { describe, expect, it } from "vitest";
import { lastLoginCell, lastLoginText } from "./lastLogin";

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

describe("lastLoginCell — 표의 두 줄 표기", () => {
  it("오늘 · 어제는 한 줄, 그보다 이전은 월일 시각 + 며칠 전", () => {
    expect(lastLoginCell("2026-10-03T12:21:00+09:00", now)).toEqual({ main: "오늘 12:21" });
    expect(lastLoginCell("2026-10-02T09:00:00+09:00", now)).toEqual({ main: "어제 09:00" });
    expect(lastLoginCell("2026-09-13T11:23:00+09:00", now)).toEqual({ main: "9월 13일 11:23", sub: "20일 전" });
  });

  it("값이 없으면 기록 없음", () => {
    expect(lastLoginCell(null, now)).toEqual({ main: "기록 없음" });
  });
});
