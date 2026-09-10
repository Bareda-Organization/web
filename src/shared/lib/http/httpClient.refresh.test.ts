import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./httpClient";
import { registerAuthGateListener } from "./authGate";
import { ApiError } from "./apiError";

// 게이트 리뷰 Important 1건 — TOKEN_EXPIRED → refreshAccessToken() → 재요청 경로.
// 이 경로는 앱의 모든 API 호출이 거치는 공통 관문이라, 재발급 성공인데 session-expired 를
// 잘못 쏘거나 재시도를 빠뜨리면 "정상 로그인 상태에서 갑자기 로그아웃" 으로 나타난다.
vi.mock("./refreshClient", () => ({
  refreshAccessToken: vi.fn(),
}));

const mockJsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe("apiFetch — TOKEN_EXPIRED 재발급 경로", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("재발급이 성공하면 원 요청을 다시 보내 그 결과를 돌려주고 session-expired 는 쏘지 않는다", async () => {
    const { refreshAccessToken } = await import("./refreshClient");
    vi.mocked(refreshAccessToken).mockResolvedValue("new-access-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(401, { error: { code: "TOKEN_EXPIRED", message: "만료" } }))
      .mockResolvedValueOnce(mockJsonResponse(200, { success: true, data: { ok: true }, message: "" }));
    vi.stubGlobal("fetch", fetchMock);

    const listener = vi.fn();
    const unregister = registerAuthGateListener(listener);

    const result = await apiFetch("/staff/dashboard");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalledWith({ type: "session-expired" });
    unregister();
  });

  it("재발급이 실패하면 session-expired 를 쏘고 원 요청을 재시도하지 않는다", async () => {
    const { refreshAccessToken } = await import("./refreshClient");
    const refreshFailure = new ApiError(401, "REFRESH_TOKEN_INVALID", "재발급 실패");
    vi.mocked(refreshAccessToken).mockRejectedValue(refreshFailure);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(401, { error: { code: "TOKEN_EXPIRED", message: "만료" } }));
    vi.stubGlobal("fetch", fetchMock);

    const listener = vi.fn();
    const unregister = registerAuthGateListener(listener);

    await expect(apiFetch("/staff/dashboard")).rejects.toBe(refreshFailure);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ type: "session-expired" });
    unregister();
  });
});
