import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let caught: unknown;
const logoutMock = vi.fn(async () => {});

vi.mock("../api", () => ({
  refresh: vi.fn(async () => {
    throw new Error("no cookie");
  }),
  getMe: vi.fn(),
  login: vi.fn(async () => ({ accountId: "2001", role: "parent", status: "active", academy: null })),
  logout: () => logoutMock(),
}));

import { useAuthSession } from "../hooks/useAuthSession";
import { AuthSessionProvider } from "./AuthSessionProvider";
import { APP_ONLY_ROLE_MESSAGE, AppOnlyRoleError } from "../lib/appOnlyRole";

const LoginProbe = () => {
  const { session, login } = useAuthSession();
  return (
    <>
      <span>{session ? "로그인됨" : "로그아웃됨"}</span>
      <button type="button" onClick={() => login("parent1", "password").catch((e) => (caught = e))}>
        로그인
      </button>
    </>
  );
};

// R32-W1 — 학부모·학생·기사·동승자 계정이 웹 로그인을 통과해 `/login` ↔ `/dashboard` 를 오갔다.
describe("AuthSessionProvider — 앱 전용 역할 로그인", () => {
  it("관계자·메인 관리자가 아닌 역할은 세션을 비우고 서버 로그인도 취소하며 안내 오류를 던진다", async () => {
    render(
      <AuthSessionProvider>
        <LoginProbe />
      </AuthSessionProvider>,
    );
    await screen.findByText("로그아웃됨");

    await act(async () => screen.getByRole("button", { name: "로그인" }).click());

    await waitFor(() => expect(caught).toBeInstanceOf(AppOnlyRoleError));
    expect((caught as Error).message).toBe(APP_ONLY_ROLE_MESSAGE);
    expect(screen.getByText("로그아웃됨")).toBeInTheDocument();
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
