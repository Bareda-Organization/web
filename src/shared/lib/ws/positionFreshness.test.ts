import { describe, expect, it } from "vitest";
import { isStalePosition } from "./positionFreshness";

describe("isStalePosition", () => {
  it("화면 값보다 이른 수신 시각만 낡은 것으로 본다 — 같은 시각은 반영한다", () => {
    expect(isStalePosition("2026-10-17T08:44:02+09:00", "2026-10-17T08:44:00+09:00")).toBe(true);
    expect(isStalePosition("2026-10-17T08:44:02+09:00", "2026-10-17T08:44:02+09:00")).toBe(false);
    expect(isStalePosition("2026-10-17T08:44:02+09:00", "2026-10-17T08:44:04+09:00")).toBe(false);
  });

  it("표기 방식(오프셋 · Z)이 달라도 같은 순간이면 같은 값이다", () => {
    expect(isStalePosition("2026-10-17T08:44:02+09:00", "2026-10-16T23:44:01Z")).toBe(true);
    expect(isStalePosition("2026-10-17T08:44:02+09:00", "2026-10-16T23:44:02Z")).toBe(false);
  });

  it("화면에 값이 없거나 시각을 읽을 수 없으면 버리지 않는다", () => {
    expect(isStalePosition(null, "2026-10-17T08:44:00+09:00")).toBe(false);
    expect(isStalePosition(undefined, "2026-10-17T08:44:00+09:00")).toBe(false);
    expect(isStalePosition("not-a-date", "2026-10-17T08:44:00+09:00")).toBe(false);
    expect(isStalePosition("2026-10-17T08:44:02+09:00", "undefined")).toBe(false);
  });
});
