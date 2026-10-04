import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDateTime, formatHeaderDate, formatHeaderDateTime, todayInSeoul } from "./dateTime";

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

// F04-06·F03-07 — 서비스 기준 "오늘" 은 서울 날짜다. `toISOString().slice(0, 10)` 은 UTC 날짜라
// 한국 시간 00:00~09:00 에 어제를 낸다.
describe("todayInSeoul", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("한국 시간 자정~09시(UTC 로는 전날)에도 서울의 오늘 날짜를 낸다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T16:00:00Z")); // 서울 2026-10-01 01:00
    expect(todayInSeoul()).toBe("2026-10-01");
    vi.setSystemTime(new Date("2026-09-30T14:59:00Z")); // 서울 2026-09-30 23:59
    expect(todayInSeoul()).toBe("2026-09-30");
  });
});

// B1 #23 — 머리줄 날짜를 브라우저 시계(toLocaleDateString)로 만들면 서울이 아닌 PC 에서 하루 어긋난다.
describe("formatHeaderDate", () => {
  it("UTC 로는 전날인 한국 시간 새벽에도 서울 날짜·요일을 낸다", () => {
    expect(formatHeaderDate(new Date("2026-09-30T16:00:00Z"))).toBe("10월 1일 (목)"); // 서울 2026-10-01 목요일 01:00
    expect(formatHeaderDate(new Date("2026-09-30T14:59:00Z"))).toBe("9월 30일 (수)"); // 서울 2026-09-30 수요일 23:59
  });
});

// R48 — 머리줄이 날짜 옆에 시각까지 보인다("10월 3일 (토) 12:45"). 시각도 PC 시계·시간대와 무관하게 서울 기준이다.
describe("formatHeaderDateTime", () => {
  it("서울 날짜·요일 뒤에 24시간제 시:분을 붙인다", () => {
    expect(formatHeaderDateTime(new Date("2026-10-03T03:45:00Z"))).toBe("10월 3일 (토) 12:45");
  });

  it("UTC 로는 전날인 한국 시간 새벽 0시대도 날짜와 시각이 같은 서울 시점에서 나온다", () => {
    expect(formatHeaderDateTime(new Date("2026-09-30T15:05:00Z"))).toBe("10월 1일 (목) 00:05"); // 서울 2026-10-01 00:05
  });
});
