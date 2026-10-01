import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../api", () => ({
  refresh: vi.fn(async () => {}),
  getMe: vi.fn(async () => ({ accountId: "2", role: "staff", status: "active", academy: null, mustChangePassword: true })),
  login: vi.fn(),
  logout: vi.fn(async () => {}),
}));

import { useAuthSession } from "../hooks/useAuthSession";
import { AuthSessionProvider } from "./AuthSessionProvider";

const MustChangeView = () => {
  const { session } = useAuthSession();
  return <span>{session?.mustChangePassword ? "변경 필요" : "변경 불필요"}</span>;
};

// Ruling 540 — 새로고침으로 로그인 응답 없이 되살아난 세션도 `/me` 의 표식을 이어받는다.
describe("AuthSessionProvider — 강제 변경 표식", () => {
  it("새로고침 부트스트랩이 /me 의 must_change_password 를 세션에 옮긴다", async () => {
    render(
      <AuthSessionProvider>
        <MustChangeView />
      </AuthSessionProvider>,
    );

    expect(await screen.findByText("변경 필요")).toBeInTheDocument();
  });
});
