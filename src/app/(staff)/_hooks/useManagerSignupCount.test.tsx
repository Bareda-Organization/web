import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getManagerSignupPendingCount } from "@/features/approval";
import { useManagerSignupCount } from "./useManagerSignupCount";

// 사이드바 배지의 값(전체 역할)은 9, 매니저 요청만은 2 — 화면에는 2 가 가야 한다.
vi.mock("@/features/approval", () => ({
  useApprovalPending: () => ({ signupCount: 9 }),
  getManagerSignupPendingCount: vi.fn(),
}));

const mockCount = vi.mocked(getManagerSignupPendingCount);

describe("useManagerSignupCount", () => {
  afterEach(() => vi.clearAllMocks());

  it("전체 역할 대기 건수(사이드바 배지)가 아니라 기사·동승자 요청만의 건수를 돌려준다", async () => {
    mockCount.mockResolvedValue(2);

    const { result } = renderHook(() => useManagerSignupCount());

    await waitFor(() => expect(result.current).toBe(2));
  });

  it("조회에 실패하면 건수를 단정하지 않는다(undefined)", async () => {
    mockCount.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useManagerSignupCount());

    await waitFor(() => expect(mockCount).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });
});
