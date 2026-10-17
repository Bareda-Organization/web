import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { useAction } from "./useAction";

describe("useAction", () => {
  it("성공하면 true 를 돌려주고 오류가 없다", async () => {
    const { result } = renderHook(() => useAction());
    let ok = false;
    await act(async () => {
      ok = await result.current.run(async () => {}, "실패했습니다");
    });
    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it("ApiError 면 서버 메시지를 보여 준다", async () => {
    const { result } = renderHook(() => useAction());
    let ok = true;
    await act(async () => {
      ok = await result.current.run(async () => {
        throw new ApiError(409, "X", "서버 메시지");
      }, "실패했습니다");
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("서버 메시지");
  });

  it("ApiError 가 아니면 대체 문구를 쓴다", async () => {
    const { result } = renderHook(() => useAction());
    await act(async () => {
      await result.current.run(async () => {
        throw new Error("boom");
      }, "실패했습니다");
    });
    expect(result.current.error).toBe("실패했습니다");
  });

  it("mapError 가 문구를 돌려주면 우선하고, undefined 면 기본 규칙으로 넘어간다", async () => {
    const { result } = renderHook(() => useAction());
    const fail = async () => {
      throw new ApiError(409, "CODE_A", "서버 메시지");
    };
    await act(async () => {
      await result.current.run(fail, "실패했습니다", (cause) => (cause instanceof ApiError && cause.code === "CODE_A" ? "특수 문구" : undefined));
    });
    expect(result.current.error).toBe("특수 문구");

    await act(async () => {
      await result.current.run(fail, "실패했습니다", () => undefined);
    });
    expect(result.current.error).toBe("서버 메시지");
  });

  it("실행 중에는 pending 이 true, 끝나면 false", async () => {
    const { result } = renderHook(() => useAction());
    let release: () => void = () => {};
    let promise: Promise<boolean> = Promise.resolve(false);
    act(() => {
      promise = result.current.run(() => new Promise<void>((resolve) => (release = resolve)), "실패했습니다");
    });
    expect(result.current.pending).toBe(true);
    await act(async () => {
      release();
      await promise;
    });
    expect(result.current.pending).toBe(false);
  });

  it("다음 실행은 이전 오류를 지운다", async () => {
    const { result } = renderHook(() => useAction());
    await act(async () => {
      await result.current.run(async () => {
        throw new Error("boom");
      }, "실패했습니다");
    });
    expect(result.current.error).toBe("실패했습니다");
    await act(async () => {
      await result.current.run(async () => {}, "실패했습니다");
    });
    expect(result.current.error).toBeNull();
  });
});
