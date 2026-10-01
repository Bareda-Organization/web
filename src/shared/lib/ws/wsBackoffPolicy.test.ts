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

  // R46-FIXRT S-5 — 터널·음영·재기동이 1분을 넘으면 6회 뒤 포기하던 연결이 끊긴 채 방치됐다.
  it("기본 정책은 몇 번째 시도에서도 포기하지 않는다", () => {
    const policy = new WsBackoffPolicy();
    expect(policy.shouldGiveUp(7)).toBe(false);
    expect(policy.shouldGiveUp(1000)).toBe(false);
  });

  it("포기 없이 오래 이어져도 대기는 30초 상한 안에서 지터만 붙는다", () => {
    const policy = new WsBackoffPolicy();
    for (const attempt of [7, 50, 1000]) {
      expect(policy.jitteredDelayFor(attempt, () => 0)).toBe(30000);
      expect(policy.jitteredDelayFor(attempt, () => 1)).toBe(21000); // 최대 30% 줄어든다.
    }
  });

  // 서버 재배포로 모든 탭이 같은 순간에 끊기면 고정 간격은 같은 순간(1·3·7·15·31·61초)에 재접속이 몰린다.
  it("지터는 대기를 줄이는 방향으로만 더해져 상한을 넘지 않는다", () => {
    const policy = new WsBackoffPolicy();
    expect(policy.jitteredDelayFor(3, () => 0)).toBe(policy.delayFor(3));
    expect(policy.jitteredDelayFor(3, () => 1)).toBe(2800); // 4000 × 0.7
    expect(policy.jitteredDelayFor(3, () => 0.5)).toBe(3400); // 4000 × 0.85
    expect(policy.jitteredDelayFor(6, () => 0)).toBeLessThanOrEqual(30000);
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
