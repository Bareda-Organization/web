import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiFetchBlob } from "./httpClient";
import { registerAuthGateListener } from "./authGate";
import { ApiError } from "./apiError";

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
