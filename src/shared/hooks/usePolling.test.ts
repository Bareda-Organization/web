import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePolling } from "./usePolling";

const INTERVAL = 1000;

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
};

// 가짜 타이머를 앞으로 돌리고 대기 중인 promise 도 비운다.
const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("응답을 받기 전에는 다음 요청을 내지 않고, 받은 뒤 간격을 두고 예약한다", async () => {
    let finish: () => void = () => {};
    const task = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    renderHook(() => usePolling(task, INTERVAL));

    await advance(INTERVAL);
    expect(task).toHaveBeenCalledTimes(1);

    await advance(INTERVAL * 5); // 응답이 안 온 채로 5주기가 지나도
    expect(task).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    await advance(INTERVAL - 1);
    expect(task).toHaveBeenCalledTimes(1);
    await advance(1);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("탭이 숨은 동안 요청이 0 이고, 돌아오면 즉시 1회 요청한다", async () => {
    const task = vi.fn(async () => {});
    renderHook(() => usePolling(task, INTERVAL));
    await advance(INTERVAL);
    expect(task).toHaveBeenCalledTimes(1);

    act(() => setHidden(true));
    await advance(INTERVAL * 10);
    expect(task).toHaveBeenCalledTimes(1);

    act(() => setHidden(false));
    await advance(0);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("실패하면 간격이 늘어나고 성공하면 원래 간격으로 돌아온다", async () => {
    const results = [false, false, true];
    const task = vi.fn(async () => results.shift() ?? true);
    renderHook(() => usePolling(task, INTERVAL));

    await advance(INTERVAL); // 1번째(실패) → 다음은 2배
    expect(task).toHaveBeenCalledTimes(1);
    await advance(INTERVAL * 2 - 1);
    expect(task).toHaveBeenCalledTimes(1);
    await advance(1); // 2번째(실패) → 다음은 4배
    expect(task).toHaveBeenCalledTimes(2);
    await advance(INTERVAL * 4 - 1);
    expect(task).toHaveBeenCalledTimes(2);
    await advance(1); // 3번째(성공) → 원래 간격
    expect(task).toHaveBeenCalledTimes(3);
    await advance(INTERVAL);
    expect(task).toHaveBeenCalledTimes(4);
  });
});
