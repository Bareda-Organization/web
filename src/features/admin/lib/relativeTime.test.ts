import { describe, expect, it } from "vitest";
import { agoText, eventTimeCell, untilText } from "./relativeTime";

const now = new Date("2026-10-03T12:45:00+09:00");

describe("agoText — 얼마 전", () => {
  it("1분 미만 방금 · 분 · 시간 · 일 단위로 내림", () => {
    expect(agoText("2026-10-03T12:44:30+09:00", now)).toBe("방금");
    expect(agoText("2026-10-03T12:15:00+09:00", now)).toBe("30분 전");
    expect(agoText("2026-10-03T07:41:00+09:00", now)).toBe("5시간 전");
    expect(agoText("2026-09-13T11:23:00+09:00", now)).toBe("20일 전");
  });

  it("미래 시각(시계 어긋남)은 방금으로 둔다", () => {
    expect(agoText("2026-10-03T13:00:00+09:00", now)).toBe("방금");
  });
});

describe("eventTimeCell — 표의 두 줄 시각", () => {
  it("오늘은 오늘 HH:mm, 이전은 월일 HH:mm, 둘째 줄은 항상 얼마 전", () => {
    expect(eventTimeCell("2026-10-03T07:41:00+09:00", now)).toEqual({ main: "오늘 07:41", sub: "5시간 전" });
    expect(eventTimeCell("2026-10-02T23:10:00+09:00", now)).toEqual({ main: "어제 23:10", sub: "13시간 전" });
    expect(eventTimeCell("2026-09-13T11:23:00+09:00", now)).toEqual({ main: "9월 13일 11:23", sub: "20일 전" });
  });
});

describe("untilText — 기준 시각까지", () => {
  it("지났으면 N분 지남, 남았으면 N시간 M분 뒤", () => {
    expect(untilText("2026-10-03T12:38:00+09:00", now)).toBe("7분 지남");
    expect(untilText("2026-10-03T14:23:00+09:00", now)).toBe("1시간 38분 뒤");
    expect(untilText("2026-10-03T14:45:00+09:00", now)).toBe("2시간 뒤");
    expect(untilText("2026-10-03T12:45:20+09:00", now)).toBe("곧");
  });
});
