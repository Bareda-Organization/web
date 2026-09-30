import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { notifyAuthGate } from "@/shared/lib/http/authGate";

const getMeMock = vi.fn();
vi.mock("../api", () => ({
  refresh: vi.fn(async () => {}),
  getMe: (...args: unknown[]) => getMeMock(...args),
  login: vi.fn(),
  logout: vi.fn(async () => {}),
}));

import { useAuthSession } from "../hooks/useAuthSession";
import { AuthSessionProvider } from "./AuthSessionProvider";

const ME = { accountId: "1001", role: "staff", status: "active", academy: null };

let refreshResult: Promise<unknown> = Promise.resolve();
const SessionView = () => {
  const { session, refreshSession } = useAuthSession();
  return (
    <>
      <span>{session ? "로그인됨" : "로그아웃됨"}</span>
      <button
        type="button"
        onClick={() => {
          refreshResult = refreshSession().catch((error: unknown) => error);
        }}
      >
        다시 확인
      </button>
    </>
  );
};

const renderProvider = async () => {
  getMeMock.mockResolvedValue(ME);
  render(
    <AuthSessionProvider>
      <SessionView />
    </AuthSessionProvider>,
  );
  await screen.findByText("로그인됨");
};

// F03-13 — /me 재확인이 네트워크 오류·5xx 로 한 번 실패했다고 인증이 풀린 것은 아니다.
describe("AuthSessionProvider — 세션 재확인 실패", () => {
  afterEach(() => vi.clearAllMocks());

  it("네트워크 오류·5xx 로 재확인이 실패하면 세션을 비우지 않고 오류를 그대로 던진다", async () => {
    await renderProvider();
    const failure = new ApiError(503, "UNKNOWN", "점검 중");
    getMeMock.mockRejectedValue(failure);

    await act(async () => screen.getByRole("button", { name: "다시 확인" }).click());

    expect(await refreshResult).toBe(failure);
    expect(screen.getByText("로그인됨")).toBeInTheDocument();
  });

  it("401 이면 세션을 비운다", async () => {
    await renderProvider();
    getMeMock.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "로그인 필요"));

    await act(async () => screen.getByRole("button", { name: "다시 확인" }).click());

    await waitFor(() => expect(screen.getByText("로그아웃됨")).toBeInTheDocument());
  });

  it("계정 게이트 통지(auth-pending) 뒤 재확인이 던져도 처리되지 않은 거절로 남지 않는다", async () => {
    await renderProvider();
    getMeMock.mockRejectedValue(new ApiError(503, "UNKNOWN", "점검 중"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    await act(async () => {
      notifyAuthGate({ type: "auth-pending" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    process.off("unhandledRejection", unhandled);

    expect(unhandled).not.toHaveBeenCalled();
    expect(screen.getByText("로그인됨")).toBeInTheDocument();
  });
});
