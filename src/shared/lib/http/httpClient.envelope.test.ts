import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./httpClient";
import { MalformedResponseError } from "./apiError";
import { mockJsonResponse } from "@/shared/testing/httpResponse";

// 성공 응답은 `{success,data,message}` 봉투다(§1.1.1). 봉투가 아닌 본문은 호출부에서 필드가 undefined 로 터지기 전에 이 계층이 종류가 있는 오류로 끊는다.
describe("apiFetch — 성공 응답 봉투 검사", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["data 키가 없는 객체", { items: [] }],
    ["에러 봉투가 200 으로 온 본문", { error: { code: "X", message: "y" } }],
    ["null", null],
    ["문자열", "ok"],
    ["배열", []],
  ])("%s 이면 MalformedResponseError 를 던진다", async (_label, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(200, body)));

    await expect(apiFetch("/staff/dashboard")).rejects.toBeInstanceOf(MalformedResponseError);
  });

  it("본문이 JSON 이 아니면 MalformedResponseError 를 던진다", async () => {
    const notJson = { ok: true, status: 200, json: async () => Promise.reject(new SyntaxError("Unexpected token <")) } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(notJson));

    await expect(apiFetch("/staff/dashboard")).rejects.toBeInstanceOf(MalformedResponseError);
  });

  it("봉투면 data 를 camelCase 로 벗겨 돌려준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(200, { success: true, data: { bus_no: "1호차" }, message: null })));

    await expect(apiFetch("/staff/dashboard")).resolves.toEqual({ busNo: "1호차" });
  });

  it("204 는 본문 없이 undefined 로 끝난다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response));

    await expect(apiFetch("/staff/x", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
