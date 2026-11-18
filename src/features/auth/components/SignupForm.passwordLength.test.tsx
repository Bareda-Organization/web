import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "./SignupForm";
import { searchAcademies, signup } from "../api";
import { useAuthSession } from "../hooks/useAuthSession";

const mockRouter = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
vi.mock("../api", () => ({ searchAcademies: vi.fn(), signup: vi.fn() }));
vi.mock("../hooks/useAuthSession", () => ({ useAuthSession: vi.fn() }));

const fillAndSubmit = async (password: string) => {
  vi.mocked(useAuthSession).mockReturnValue({
    bootstrapStatus: "ready",
    session: null,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  });
  vi.mocked(searchAcademies).mockResolvedValue([{ id: "1", name: "학원1", region: "서울", code: "A1" }]);
  vi.mocked(signup).mockResolvedValue({ accountStatus: "pending", requestedAt: "2026-01-01T00:00:00Z", approver: "staff" });
  render(<SignupForm />);
  const values = { 이름: "김관계", 연락처: "010-1111-2222", 아이디: "staffnew", 비밀번호: password };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });
  }
  fireEvent.change(screen.getByPlaceholderText("학원명 또는 학원 코드로 검색"), { target: { value: "학원" } });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  fireEvent.click(await screen.findByRole("button", { name: /학원1/ }));
  fireEvent.click(screen.getByRole("button", { name: "가입 신청" }));
};

// 새 비밀번호 최소 길이는 8자다(구성 규칙 없음) — 서버 422 를 받기 전에 같은 문구로 막는다.
describe("SignupForm — 비밀번호 최소 길이", () => {
  afterEach(() => vi.clearAllMocks());

  it("7자는 가입 요청을 보내지 않고 안내한다", async () => {
    await fillAndSubmit("abcdefg");

    expect(await screen.findByText("비밀번호는 8자 이상이어야 합니다")).toBeInTheDocument();
    expect(signup).not.toHaveBeenCalled();
  });

  it("8자는 가입 요청을 보낸다", async () => {
    await fillAndSubmit("abcdefgh");

    await waitFor(() => expect(signup).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("비밀번호는 8자 이상이어야 합니다")).not.toBeInTheDocument();
  });
});
