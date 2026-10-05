import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiFetchBlob } from "./httpClient";
import { registerAuthGateListener } from "./authGate";
import { ApiError, NetworkError } from "./apiError";

// 보고서 4항이 지목한 두 번째 공백 — httpClient → authGate 이벤트 전달.
// 403 AUTH_PENDING·AUTH_REJECTED 는 대기 화면 재판정을 깨워야 하고, 같은 403 이라도
// 다른 코드(FORBIDDEN 등)는 깨우면 안 된다 — "조용히 no-op" 이 되는 결함을 여기서 잡는다.
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe("apiFetch — 계정 상태 게이트 이벤트 전달", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("403 AUTH_PENDING 을 받으면 authGate 리스너에게 auth-pending 을 알린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse(403, { error: { code: "AUTH_PENDING", message: "대기 중" } })),
    );
    const listener = vi.fn();
    const unregister = registerAuthGateListener(listener);

    await expect(apiFetch("/staff/dashboard")).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ type: "auth-pending" });
    unregister();
  });

  it("403 AUTH_REJECTED 도 동일하게 auth-pending 이벤트를 보낸다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse(403, { error: { code: "AUTH_REJECTED", message: "거절됨" } })),
    );
    const listener = vi.fn();
    const unregister = registerAuthGateListener(listener);

    await expect(apiFetch("/staff/dashboard")).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledWith({ type: "auth-pending" });
    unregister();
  });

  it("같은 403 이라도 계정 상태 게이트 코드가 아니면 이벤트를 보내지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse(403, { error: { code: "FORBIDDEN", message: "권한 없음" } })),
    );
    const listener = vi.fn();
    const unregister = registerAuthGateListener(listener);

    await expect(apiFetch("/staff/dashboard")).rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();
    unregister();
  });
});

// Ruling 377 — 사진 GET 은 봉투가 아니라 이미지 바이트가 온다. 에러 변환은 apiFetch 와 같아야 한다.
describe("apiFetchBlob", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("성공하면 응답 본문을 Blob 으로 돌려준다", async () => {
    const blob = new Blob(["img"]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob } as Response));

    await expect(apiFetchBlob("/files/photos/a.jpg")).resolves.toBe(blob);
  });

  it("404 는 ApiError 로 던진다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse(404, { error: { code: "STUDENT_NOT_FOUND", message: "없음" } })),
    );

    await expect(apiFetchBlob("/files/photos/a.jpg")).rejects.toBeInstanceOf(ApiError);
  });
});

// R46-FIXCONN C-8 — 서버가 연결은 받고 응답을 안 주면 브라우저가 포기할 때까지(수 분) 그 조회가 매달려 폴링이 멈춘다.
// GET 은 응답 헤더를 15초 안에 못 받으면 끊어 실패로 알린다(폴링의 실패 백오프가 이어받는다). 쓰기(POST·PATCH)는 서버가 이미 처리를
// 시작했을 수 있어 끊지 않는다.
describe("apiFetch — 응답 시간 제한", () => {
  // 신호가 중단되면 거절하는 가짜 fetch — 응답을 끝내 안 주는 서버를 흉내 낸다.
  const hangingFetch = () =>
    vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    });

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("GET 은 15초 안에 응답이 없으면 NetworkError 로 끊긴다", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const result = apiFetch("/staff/dashboard").then(
      () => "응답",
      (cause: unknown) => cause,
    );

    await vi.advanceTimersByTimeAsync(14_999);
    let settled = false;
    void result.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBeInstanceOf(NetworkError);
  });

  it("쓰기(POST)는 시간 제한으로 끊지 않는다 — 서버가 이미 처리를 시작했을 수 있다", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    let settled = false;
    void apiFetch("/staff/emergencies", { method: "POST", body: {} }).then(
      () => (settled = true),
      () => (settled = true),
    );

    await vi.advanceTimersByTimeAsync(120_000);

    expect(settled).toBe(false);
  });

  it("호출부가 준 신호로 중단해도 여전히 중단된다", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const controller = new AbortController();
    const result = apiFetch("/staff/dashboard", { signal: controller.signal }).then(
      () => "응답",
      (cause: unknown) => cause,
    );

    controller.abort();

    expect(await result).toBeInstanceOf(NetworkError);
  });

  it("응답이 제때 오면 타이머를 남기지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockJsonResponse(200, { data: { ok: true } })));

    await expect(apiFetch("/staff/dashboard")).resolves.toEqual({ ok: true });

    expect(vi.getTimerCount()).toBe(0);
  });
});

// ngrok 무료 도메인은 브라우저가 보낸 GET 을 경고 페이지로 바꿔 돌려준다 — 그 페이지에는 CORS 허용 헤더가 없어
// 브라우저가 응답을 버린다(Vercel 웹 + ngrok API 구성, STAGING.md §4.1 · Ruling 841). 우회 헤더가 붙는지 본다.
describe("apiFetch — ngrok 무료 도메인 경고 페이지 우회", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const headersSentTo = async (apiHost: string): Promise<Record<string, string>> => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", apiHost);
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(200, { data: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const { apiFetch: freshApiFetch } = await import("./httpClient");
    await freshApiFetch("/admin/academies");
    return fetchMock.mock.calls[0][1].headers as Record<string, string>;
  };

  it("API 주소가 ngrok 무료 도메인이면 GET 에 ngrok-skip-browser-warning 을 붙인다", async () => {
    const headers = await headersSentTo("https://example.ngrok-free.dev");
    expect(headers["ngrok-skip-browser-warning"]).toBeDefined();
  });

  it("다른 주소에는 붙이지 않는다", async () => {
    const headers = await headersSentTo("https://api.example.com");
    expect(headers["ngrok-skip-browser-warning"]).toBeUndefined();
  });
});
