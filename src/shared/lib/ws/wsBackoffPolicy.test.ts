import { describe, expect, it } from "vitest";
import { WsBackoffPolicy } from "./wsBackoffPolicy";

describe("WsBackoffPolicy", () => {
  it("기본값으로 1·2·4·8·16·30(상한) 초를 순서대로 계산한다", () => {
    const policy = new WsBackoffPolicy();
    expect(policy.delayFor(1)).toBe(1000);
    expect(policy.delayFor(2)).toBe(2000);
    expect(policy.delayFor(3)).toBe(4000);
    expect(policy.delayFor(4)).toBe(8000);
    expect(policy.delayFor(5)).toBe(16000);
    expect(policy.delayFor(6)).toBe(30000);
  });

  it("상한을 넘는 계산값은 maxDelayMs 로 자른다", () => {
    const policy = new WsBackoffPolicy();
    // 7번째는 공식대로면 64초지만 30초로 잘려야 한다.
    expect(policy.delayFor(7)).toBe(30000);
  });

  it("attempt 가 1 미만이면 던진다", () => {
    const policy = new WsBackoffPolicy();
    expect(() => policy.delayFor(0)).toThrow();
  });

  it("maxAttempts 를 넘는 시도는 포기해야 한다고 답한다", () => {
    const policy = new WsBackoffPolicy({ maxAttempts: 6 });
    expect(policy.shouldGiveUp(6)).toBe(false);
    expect(policy.shouldGiveUp(7)).toBe(true);
  });

  it("옵션으로 초기값·배수·상한·최대시도를 바꿀 수 있다", () => {
    const policy = new WsBackoffPolicy({ initialDelayMs: 100, multiplier: 3, maxDelayMs: 500, maxAttempts: 2 });
    expect(policy.delayFor(1)).toBe(100);
    expect(policy.delayFor(2)).toBe(300);
    expect(policy.delayFor(3)).toBe(500); // 900 → 500 으로 상한
    expect(policy.shouldGiveUp(2)).toBe(false);
    expect(policy.shouldGiveUp(3)).toBe(true);
  });
});
