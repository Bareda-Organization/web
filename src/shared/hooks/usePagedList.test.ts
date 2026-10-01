import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/http";
import { usePagedList } from "./usePagedList";

const pageOf = (items: string[], hasNext = false, totalCount = items.length) => ({ items, totalCount, hasNext });
const OPTIONS = { errorMessage: "목록을 불러오지 못했습니다" };

describe("usePagedList", () => {
  it("쪽을 옮기면 그 쪽 번호(0 기점)로 다시 조회한다", async () => {
    const fetchPage = vi.fn(async (page: number) => pageOf([`p${page}`], page < 1, 21));
    const { result } = renderHook(() => usePagedList(fetchPage, OPTIONS));
    await waitFor(() => expect(result.current.items).toEqual(["p0"]));
    expect(result.current.totalCount).toBe(21);

    act(() => result.current.setPage(1));

    await waitFor(() => expect(result.current.items).toEqual(["p1"]));
    expect(fetchPage).toHaveBeenLastCalledWith(1);
  });

  // F03-04 — 서버는 첫 쪽 20건만 준다. 화면이 total_count·has_next 를 그대로 받아야 다음 쪽으로 갈 수 있다.
  it("resetKey 가 바뀌면 0쪽으로 돌아가며 요청은 한 번만 나간다(F03-17)", async () => {
    const fetchPage = vi.fn(async (page: number) => pageOf([`p${page}`], true, 60));
    const { result, rerender } = renderHook(({ key }) => usePagedList(fetchPage, { ...OPTIONS, resetKey: key }), {
      initialProps: { key: "a" },
    });
    await waitFor(() => expect(result.current.items).toEqual(["p0"]));
    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.items).toEqual(["p2"]));
    fetchPage.mockClear();

    rerender({ key: "b" });

    await waitFor(() => expect(result.current.items).toEqual(["p0"]));
    expect(result.current.page).toBe(0);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0);
  });

  // F03-17 — 응답 순서가 뒤바뀌어도 마지막에 보낸 요청의 응답이 남아야 한다.
  it("먼저 보낸 요청의 응답이 늦게 와도 마지막 요청의 결과를 덮지 않는다", async () => {
    const resolvers: Array<(value: ReturnType<typeof pageOf>) => void> = [];
    const fetchPage = vi.fn(() => new Promise<ReturnType<typeof pageOf>>((resolve) => resolvers.push(resolve)));
    const { rerender, result } = renderHook(({ key }) => usePagedList(fetchPage, { ...OPTIONS, resetKey: key }), {
      initialProps: { key: "a" },
    });
    rerender({ key: "b" });
    await waitFor(() => expect(resolvers).toHaveLength(2));

    await act(async () => {
      resolvers[1](pageOf(["b"]));
    });
    await act(async () => {
      resolvers[0](pageOf(["a"]));
    });

    expect(result.current.items).toEqual(["b"]);
  });

  // F03-06 — 폴링 한 번이 실패해도 이미 보이던 목록을 비우고 "없습니다" 로 그리지 않는다.
  it("주기 갱신이 실패하면 직전 목록을 유지하고 오류만 알린다", async () => {
    vi.useFakeTimers();
    try {
      const fetchPage = vi
        .fn<(page: number) => Promise<ReturnType<typeof pageOf>>>()
        .mockResolvedValueOnce(pageOf(["긴급1", "긴급2"]))
        .mockRejectedValueOnce(new ApiError(503, "UNKNOWN", "점검 중"));
      const { result } = renderHook(() => usePagedList(fetchPage, { ...OPTIONS, pollMs: 5000 }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(result.current.items).toEqual(["긴급1", "긴급2"]);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(result.current.error).toBe("점검 중");
      expect(result.current.items).toEqual(["긴급1", "긴급2"]);
    } finally {
      vi.useRealTimers();
    }
  });

  // R46-FUWEB — 주기 갱신은 응답을 받은 뒤 다음 요청을 예약한다(`usePolling`). 응답 없는 서버에 요청이 겹쳐 쌓이지 않는다.
  it("주기 갱신 응답이 오기 전에는 다음 요청을 내지 않는다", async () => {
    vi.useFakeTimers();
    try {
      const fetchPage = vi
        .fn<(page: number) => Promise<ReturnType<typeof pageOf>>>()
        .mockResolvedValueOnce(pageOf(["a"]))
        .mockImplementation(() => new Promise(() => {}));
      renderHook(() => usePagedList(fetchPage, { ...OPTIONS, pollMs: 5000 }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000 * 4);
      });

      expect(fetchPage).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("주기 갱신이 실패하면 다음 요청까지의 간격이 늘어난다", async () => {
    vi.useFakeTimers();
    try {
      const fetchPage = vi
        .fn<(page: number) => Promise<ReturnType<typeof pageOf>>>()
        .mockResolvedValueOnce(pageOf(["a"]))
        .mockRejectedValue(new ApiError(503, "UNKNOWN", "점검 중"));
      renderHook(() => usePagedList(fetchPage, { ...OPTIONS, pollMs: 5000 }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(fetchPage).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
