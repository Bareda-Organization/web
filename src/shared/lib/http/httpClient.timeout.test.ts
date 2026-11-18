import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiFetchMultipart } from "./httpClient";
import { NetworkError, RequestTimeoutError } from "./apiError";

// 응답을 끝내 안 주는 서버 — 신호가 중단되면 거절한다.
const hangingFetch = () =>
  vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
  );

// 내장 `AbortSignal.timeout` 은 가짜 시계를 타지 않아, 같은 일을 가짜 타이머로 하는 대역을 끼운다.
const fakeAbortTimeout = () =>
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), ms);
    return controller.signal;
  });

const settle = (promise: Promise<unknown>) =>
  promise.then(
    () => "응답",
    (cause: unknown) => cause,
  );

// 쓰기도 응답 헤더를 한도 안에 못 받으면 끊는다 — 끊긴 쓰기는 서버가 처리했을 수 있어 호출부가 구별하도록 종류가 있는 오류로 올린다.
describe("요청 시간 제한 — 쓰기 · 종류가 있는 오류", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakeAbortTimeout();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("POST 는 30초 안에 응답이 없으면 RequestTimeoutError 로 끝난다", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const result = settle(apiFetch("/staff/emergencies", { method: "POST", body: {} }));

    await vi.advanceTimersByTimeAsync(29_999);
    let done = false;
    void result.then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBeInstanceOf(RequestTimeoutError);
  });

  it("PATCH 도 같은 한도로 끊긴다", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const result = settle(apiFetch("/staff/x", { method: "PATCH", body: {} }));

    await vi.advanceTimersByTimeAsync(30_000);

    expect(await result).toBeInstanceOf(RequestTimeoutError);
  });

  it("파일 업로드(multipart)는 60초 안에 응답이 없으면 RequestTimeoutError 로 끝난다", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const result = settle(apiFetchMultipart("/staff/students/1/photo", { data: {} }));

    await vi.advanceTimersByTimeAsync(60_000);

    expect(await result).toBeInstanceOf(RequestTimeoutError);
  });

  it("GET 의 시간 제한 오류도 RequestTimeoutError 이며 NetworkError 로도 잡힌다", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const result = settle(apiFetch("/staff/dashboard"));

    await vi.advanceTimersByTimeAsync(15_000);

    const cause = await result;
    expect(cause).toBeInstanceOf(RequestTimeoutError);
    expect(cause).toBeInstanceOf(NetworkError);
  });

  it("호출부가 직접 중단한 요청은 시간 제한 오류가 아니라 NetworkError 이다", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const controller = new AbortController();
    const result = settle(apiFetch("/staff/x", { method: "POST", body: {}, signal: controller.signal }));

    controller.abort();

    const cause = await result;
    expect(cause).toBeInstanceOf(NetworkError);
    expect(cause).not.toBeInstanceOf(RequestTimeoutError);
  });
});
