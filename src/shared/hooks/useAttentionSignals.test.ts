import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAttentionTitle, useAttentionSignals } from "./useAttentionSignals";

const { mockNotify } = vi.hoisted(() => ({ mockNotify: vi.fn() }));
vi.mock("../lib/attention/attentionAlert", () => ({ notifyAttention: mockNotify }));

describe("buildAttentionTitle", () => {
  it("처리할 것이 없으면 기본 제목, 있으면 합계를 앞에 붙이고 비상이 있으면 그것을 알린다", () => {
    expect(buildAttentionTitle(0, 0)).toBe("바래다 관계자 웹");
    expect(buildAttentionTitle(0, 3)).toBe("(3) 바래다 관계자 웹");
    expect(buildAttentionTitle(1, 2)).toBe("(3) 비상 발생 · 바래다 관계자 웹");
  });
});

describe("useAttentionSignals", () => {
  beforeEach(() => mockNotify.mockClear());

  it("건수에 맞춰 탭 제목을 바꾸고 떠나면 기본 제목으로 돌려놓는다", () => {
    const { rerender, unmount } = renderHook(({ e, a }) => useAttentionSignals(e, a, true), { initialProps: { e: 0, a: 2 } });
    expect(document.title).toBe("(2) 바래다 관계자 웹");
    rerender({ e: 1, a: 2 });
    expect(document.title).toBe("(3) 비상 발생 · 바래다 관계자 웹");
    unmount();
    expect(document.title).toBe("바래다 관계자 웹");
  });

  it("처음 받은 건수로는 알리지 않고, 그 뒤로 늘어날 때만 알린다", () => {
    const { rerender } = renderHook(({ a, ready }) => useAttentionSignals(0, a, ready), {
      initialProps: { a: 0, ready: false },
    });
    rerender({ a: 4, ready: true }); // 처음 도착한 값 — 기준선
    expect(mockNotify).not.toHaveBeenCalled();
    rerender({ a: 4, ready: true });
    expect(mockNotify).not.toHaveBeenCalled();
    rerender({ a: 5, ready: true });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    rerender({ a: 3, ready: true }); // 줄어들 때는 알리지 않는다
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });
});
