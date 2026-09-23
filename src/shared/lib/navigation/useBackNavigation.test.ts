import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 뒤로가기(2026-09-23 사용자 지시) — 이 앱 안에서 지나온 화면으로 돌아간다. 앱 밖(로그인 화면·다른 사이트)
// 으로는 나가지 않는다. 처음 들어온 화면이면 상세 → 목록처럼 한 단계 위로 간다.
const router = { back: vi.fn(), push: vi.fn() };
let pathname = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => router }));

import { useBackNavigation } from "./useBackNavigation";

beforeEach(() => {
  vi.clearAllMocks();
  pathname = "/dashboard";
});

const 이동 = (rerender: () => void, next: string) => {
  pathname = next;
  rerender();
};

describe("useBackNavigation", () => {
  it("처음 들어온 최상위 화면에서는 돌아갈 곳이 없다(로그인 화면으로 나가지 않는다)", () => {
    const { result } = renderHook(() => useBackNavigation());

    expect(result.current.canGoBack).toBe(false);
  });

  it("앱 안에서 옮겨 왔으면 브라우저 이력으로 돌아간다", () => {
    const { result, rerender } = renderHook(() => useBackNavigation());
    이동(rerender, "/route");

    expect(result.current.canGoBack).toBe(true);
    act(() => result.current.goBack());
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("상세 화면에 바로 들어왔으면 목록으로 올라간다", () => {
    pathname = "/route/1000";
    const { result } = renderHook(() => useBackNavigation());

    expect(result.current.canGoBack).toBe(true);
    act(() => result.current.goBack());
    expect(router.push).toHaveBeenCalledWith("/route");
    expect(router.back).not.toHaveBeenCalled();
  });

  it("브라우저의 뒤로 버튼으로 돌아와도 지나온 목록이 어긋나지 않는다", () => {
    const { result, rerender } = renderHook(() => useBackNavigation());
    이동(rerender, "/route");
    이동(rerender, "/dashboard");

    expect(result.current.canGoBack).toBe(false);
  });
});
