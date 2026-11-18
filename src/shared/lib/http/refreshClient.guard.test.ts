import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshAccessToken } from "./refreshClient";
import { getAccessToken, setAccessToken } from "./accessTokenStore";
import { MalformedResponseError } from "./apiError";
import { mockJsonResponse } from "@/shared/testing/httpResponse";

// 재발급 응답은 `data.access_token` 문자열이 있어야 한다 — 없거나 타입이 틀리면 토큰 저장소를 건드리지 않고 오류로 끝낸다.
describe("refreshAccessToken — 응답 검사", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it.each([
    ["data 가 비어 있음", { success: true, data: {} }],
    ["access_token 이 숫자", { success: true, data: { access_token: 7 } }],
    ["access_token 이 빈 문자열", { success: true, data: { access_token: "" } }],
    ["봉투가 아님", { access_token: "t" }],
  ])("%s 이면 MalformedResponseError 를 던지고 토큰을 저장하지 않는다", async (_label, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(200, body)));

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(MalformedResponseError);
    expect(getAccessToken()).toBeNull();
  });

  it("정상 응답이면 토큰을 저장하고 돌려준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(200, { success: true, data: { access_token: "t1" } })));

    await expect(refreshAccessToken()).resolves.toBe("t1");
    expect(getAccessToken()).toBe("t1");
  });
});
