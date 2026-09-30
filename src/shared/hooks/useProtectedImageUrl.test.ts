import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setAccessToken } from "../lib/http";
import { API_BASE_URL } from "../lib/http/config";
import { useProtectedImageUrl } from "./useProtectedImageUrl";

// Ruling 377 — 학생 사진은 로그인 토큰이 있어야 받는다. `<img src>` 는 Authorization 을
// 못 실으므로 fetch → blob → 객체 URL 로 바꿔 그린다. 옛 공개 절대 URL 도 그대로 그려야 한다.
const imageResponse = (status: number): Response =>
  ({
    ok: status === 200,
    status,
    blob: async () => new Blob(["img"], { type: "image/jpeg" }),
    json: async () => ({ error: { code: "STUDENT_NOT_FOUND", message: "없음" } }),
  }) as Response;

describe("useProtectedImageUrl", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:photo-1");
    URL.revokeObjectURL = vi.fn();
    setAccessToken("tok-1");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it("상대 경로는 호스트 + 경로로 부르고(/api/v1 중복 없음) Bearer 토큰을 싣는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useProtectedImageUrl("/api/v1/files/photos/a.jpg"));

    await waitFor(() => expect(result.current).toBe("blob:photo-1"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/files/photos/a.jpg`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-1");
  });

  it("404 면 undefined(사진 없음 대체 표시)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(404)));

    const { result } = renderHook(() => useProtectedImageUrl("/api/v1/files/photos/a.jpg"));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("언마운트하면 만든 객체 URL 을 해제한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse(200)));

    const { result, unmount } = renderHook(() => useProtectedImageUrl("/api/v1/files/photos/a.jpg"));
    await waitFor(() => expect(result.current).toBe("blob:photo-1"));
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
  });

  it("옛 공개 절대 URL 은 요청 없이 그대로 돌려준다", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useProtectedImageUrl("https://cdn.example.com/p.jpg"));

    expect(result.current).toBe("https://cdn.example.com/p.jpg");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("주소가 없으면 undefined", () => {
    const { result } = renderHook(() => useProtectedImageUrl(undefined));
    expect(result.current).toBeUndefined();
  });
});
