import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../api", () => ({
  refresh: vi.fn(async () => {}),
  getMe: vi.fn(async () => ({ accountId: "1001", role: "staff", status: "active", academy: null })),
  login: vi.fn(),
  logout: vi.fn(async () => {
    throw new Error("network down");
  }),
}));

import { useAuthSession } from "../hooks/useAuthSession";
import { AuthSessionProvider } from "./AuthSessionProvider";

const 세션_표시 = () => {
  const { session, logout } = useAuthSession();
  return (
    <>
      <span>{session ? "로그인됨" : "로그아웃됨"}</span>
      <button type="button" onClick={() => logout().catch(() => {})}>
        나가기
      </button>
    </>
  );
};

// 2026-09-23 — 로그아웃 버튼을 달며 드러난 것. 서버 호출이 실패하면 토큰은 지워지는데(logout API 의 finally)
// 세션은 그대로라, 화면은 로그인된 채 남고 다음 요청마다 401 이 났다.
describe("AuthSessionProvider — 로그아웃", () => {
  it("서버 호출이 실패해도 이 기기의 세션은 비운다", async () => {
    render(
      <AuthSessionProvider>
        <세션_표시 />
      </AuthSessionProvider>,
    );
    await screen.findByText("로그인됨");

    await act(async () => screen.getByRole("button", { name: "나가기" }).click());

    await waitFor(() => expect(screen.getByText("로그아웃됨")).toBeInTheDocument());
  });
});
