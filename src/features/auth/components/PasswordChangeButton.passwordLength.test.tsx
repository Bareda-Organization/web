import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { changePassword } from "../api";
import { PasswordChangeButton } from "./PasswordChangeButton";

vi.mock("../api", () => ({ changePassword: vi.fn() }));
vi.mock("../hooks/useAuthSession", () => ({ useAuthSession: () => ({ logout: vi.fn().mockResolvedValue(undefined) }) }));

const submitWith = (next: string) => {
  render(<PasswordChangeButton />);
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
  fireEvent.change(screen.getByLabelText(/현재 비밀번호/), { target: { value: "old" } });
  fireEvent.change(screen.getByLabelText(/^새 비밀번호 \*/), { target: { value: next } });
  fireEvent.change(screen.getByLabelText(/새 비밀번호 확인/), { target: { value: next } });
  fireEvent.click(screen.getByRole("button", { name: "변경" }));
};

// 새 비밀번호 최소 길이는 8자다 — 현재 비밀번호는 기존 계정이 있어 길이를 보지 않는다.
describe("PasswordChangeButton — 새 비밀번호 최소 길이", () => {
  afterEach(() => vi.clearAllMocks());

  it("7자는 서버를 부르지 않고 안내한다", () => {
    submitWith("abcdefg");

    expect(screen.getByText("비밀번호는 8자 이상이어야 합니다")).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("8자는 서버에 보낸다", async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined);
    submitWith("abcdefgh");

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({ currentPassword: "old", newPassword: "abcdefgh" }));
  });
});
