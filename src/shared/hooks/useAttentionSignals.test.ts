import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAttentionTitle, useAttentionSignals } from "./useAttentionSignals";
import type { AttentionTexts } from "./useAttentionSignals";

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

// Ruling 847 — 메인 관리자 콘솔은 제목에 콘솔 이름을 쓰고, 차단 계정이 늘면 "승인 요청" 이 아니라 차단 계정이라고 알린다.
describe("useAttentionSignals — 콘솔별 문구 · 차단 계정(Ruling 847)", () => {
  beforeEach(() => mockNotify.mockClear());

  const CONSOLE: AttentionTexts = {
    baseTitle: "바래다 메인 관리자 콘솔",
    approval: { title: "관계자 가입 승인", body: (count) => `처리할 관계자 가입 승인 요청이 ${count}건 있습니다.` },
    blocked: { title: "차단 계정", body: (count) => `로그인이 차단된 계정이 ${count}건 있습니다.` },
  };

  it("buildAttentionTitle 은 기본 제목을 바꿔 쓸 수 있다", () => {
    expect(buildAttentionTitle(1, 2, CONSOLE.baseTitle)).toBe("(3) 비상 발생 · 바래다 메인 관리자 콘솔");
    expect(buildAttentionTitle(0, 0, CONSOLE.baseTitle)).toBe("바래다 메인 관리자 콘솔");
  });

  it("탭 제목에 콘솔 이름과 승인 + 차단 합계를 쓰고, 떠나면 콘솔 이름으로 돌려놓는다", () => {
    const { unmount } = renderHook(() => useAttentionSignals(0, 2, true, CONSOLE, 3));
    expect(document.title).toBe("(5) 바래다 메인 관리자 콘솔");
    unmount();
    expect(document.title).toBe("바래다 메인 관리자 콘솔");
  });

  it("차단 계정만 늘면 차단 계정 문구로 알리고 '승인' 이라 부르지 않는다", () => {
    const { rerender } = renderHook(({ blocked }) => useAttentionSignals(0, 2, true, CONSOLE, blocked), { initialProps: { blocked: 1 } });
    rerender({ blocked: 2 });
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith("차단 계정", "로그인이 차단된 계정이 2건 있습니다.");
    expect(JSON.stringify(mockNotify.mock.calls)).not.toContain("승인");
  });

  it("가입 승인 요청이 늘면 승인 문구로 알린다", () => {
    const { rerender } = renderHook(({ approval }) => useAttentionSignals(0, approval, true, CONSOLE, 1), { initialProps: { approval: 2 } });
    rerender({ approval: 3 });
    expect(mockNotify).toHaveBeenCalledWith("관계자 가입 승인", "처리할 관계자 가입 승인 요청이 3건 있습니다.");
  });

  it("문구를 안 넘기면(관계자 웹) 기존 제목과 '승인 요청' 알림 그대로다", () => {
    const { rerender } = renderHook(({ approval }) => useAttentionSignals(0, approval, true), { initialProps: { approval: 1 } });
    expect(document.title).toBe("(1) 바래다 관계자 웹");
    rerender({ approval: 2 });
    expect(mockNotify).toHaveBeenCalledWith("승인 요청", "처리할 승인 요청이 2건 있습니다.");
  });
});
