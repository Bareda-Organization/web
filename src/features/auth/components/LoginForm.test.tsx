import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { LoginForm } from "./LoginForm";
import { useAuthSession } from "../hooks/useAuthSession";

// `useAuthSession` 을 모킹해 login() 이 던지는 ApiError 코드별로 화면이 다른 문구를
// 그리는지 확인한다 — 보고서 4항이 지목한 "LoginForm 의 에러 코드별 분기" 그 자리다.
// 여기서 다루는 3종(INVALID_CREDENTIALS·AUTH_ACCOUNT_BLOCKED·AUTH_STAFF_INACTIVE)은
// LoginForm.tsx 가 이름을 걸고 처리하는 코드 전부다.
vi.mock("../hooks/useAuthSession", () => ({
  useAuthSession: vi.fn(),
}));

const mockUseAuthSession = vi.mocked(useAuthSession);

const submitLoginForm = async (loginError: ApiError) => {
  mockUseAuthSession.mockReturnValue({
    bootstrapStatus: "ready",
    session: null,
    login: vi.fn().mockRejectedValue(loginError),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  });

  render(<LoginForm />);

  fireEvent.change(document.querySelector('input[autocomplete="username"]')!, {
    target: { value: "staffA" },
  });
  fireEvent.change(document.querySelector('input[autocomplete="current-password"]')!, {
    target: { value: "password" },
  });
  fireEvent.submit(document.querySelector("form")!);

  // login() 은 async — 실패 상태가 반영될 때까지 한 틱 기다린다.
  await screen.findByRole("button", { name: "로그인" });
};

describe("LoginForm — 에러 코드별 분기", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("INVALID_CREDENTIALS 는 남은 시도 횟수를 안내한다", async () => {
    await submitLoginForm(
      new ApiError(401, "INVALID_CREDENTIALS", "비밀번호가 틀렸습니다", { remaining_attempts: 2 }),
    );
    expect(await screen.findByText("아이디 또는 비밀번호가 올바르지 않습니다")).toBeInTheDocument();
    expect(screen.getByText("이 계정은 앞으로 2회 더 실패하면 잠깁니다.")).toBeInTheDocument();
  });

  it("AUTH_ACCOUNT_BLOCKED 는 차단 안내(UF-X-04)를 인라인으로 보여준다", async () => {
    await submitLoginForm(new ApiError(403, "AUTH_ACCOUNT_BLOCKED", "계정이 잠겼습니다"));
    expect(await screen.findByText("이 계정은 잠겨 있습니다")).toBeInTheDocument();
    expect(screen.getByText(/다른 기기나 다른 사람의 접속과는/)).toBeInTheDocument();
  });

  it("AUTH_STAFF_INACTIVE 는 퇴사 안내를 보여준다", async () => {
    await submitLoginForm(new ApiError(403, "AUTH_STAFF_INACTIVE", "퇴사 처리됨"));
    expect(await screen.findByText("퇴사 처리된 계정입니다")).toBeInTheDocument();
  });
});
