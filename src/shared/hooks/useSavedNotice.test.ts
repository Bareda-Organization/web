import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSavedNotice } from "./useSavedNotice";

// B1 #19 — 등록·수정 뒤 대화상자가 닫히고 표만 바뀌어 저장됐는지 알 수 없었다.
describe("useSavedNotice", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("알리면 문구가 생기고 잠시 뒤 사라진다", () => {
    const { result } = renderHook(() => useSavedNotice());
    expect(result.current.notice).toBeNull();

    act(() => result.current.showNotice("변경 사항을 반영했습니다"));
    expect(result.current.notice).toBe("변경 사항을 반영했습니다");

    act(() => vi.advanceTimersByTime(3999));
    expect(result.current.notice).toBe("변경 사항을 반영했습니다");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.notice).toBeNull();
  });

  it("연달아 알리면 마지막 알림부터 다시 잰다", () => {
    const { result } = renderHook(() => useSavedNotice());
    act(() => result.current.showNotice("첫째"));
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.showNotice("둘째"));
    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.notice).toBe("둘째");
  });
});
