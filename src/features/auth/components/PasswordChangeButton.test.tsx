import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { changePassword } from "../api";
import { PasswordChangeButton } from "./PasswordChangeButton";

const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock("../api", () => ({ changePassword: vi.fn() }));
vi.mock("../hooks/useAuthSession", () => ({ useAuthSession: () => ({ logout: mockLogout }) }));

const mockChange = vi.mocked(changePassword);

const openDialogAndFill = (current: string, next: string, confirm: string) => {
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
  fireEvent.change(screen.getByLabelText(/현재 비밀번호/), { target: { value: current } });
  fireEvent.change(screen.getByLabelText(/^새 비밀번호 \*/), { target: { value: next } });
  fireEvent.change(screen.getByLabelText(/새 비밀번호 확인/), { target: { value: confirm } });
};

// A #4 — 관리자가 초기화해 준 임시 비밀번호를 관계자·메인 관리자가 직접 바꾸는 길.
describe("PasswordChangeButton", () => {
  afterEach(() => vi.clearAllMocks());

  it("새 비밀번호와 확인이 다르면 서버를 부르지 않고 안내한다", () => {
    render(<PasswordChangeButton />);
    openDialogAndFill("old-pass", "new-pass-1", "new-pass-2");

    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(screen.getByText("새 비밀번호와 확인이 같지 않습니다.")).toBeInTheDocument();
    expect(mockChange).not.toHaveBeenCalled();
  });

  it("72바이트를 넘는 새 비밀번호는 서버를 부르지 않고 안내한다(한글 25자)", () => {
    const tooLong = "가".repeat(25);
    render(<PasswordChangeButton />);
    openDialogAndFill("old-pass", tooLong, tooLong);

    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/한글 24자/);
    expect(mockChange).not.toHaveBeenCalled();
  });

  it("현재 비밀번호가 틀리면(401 INVALID_CREDENTIALS) 그 사유를 보이고 로그아웃하지 않는다", async () => {
    mockChange.mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다"));
    render(<PasswordChangeButton />);
    openDialogAndFill("wrong", "new-pass-1", "new-pass-1");

    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(await screen.findByText("현재 비밀번호가 맞지 않습니다.")).toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("성공하면 서버에 두 값을 보내고, 다시 로그인하라고 안내한 뒤 [다시 로그인] 에서 로그아웃한다", async () => {
    mockChange.mockResolvedValue(undefined);
    render(<PasswordChangeButton />);
    openDialogAndFill("old-pass", "new-pass-1", "new-pass-1");

    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(await screen.findByText(/새 비밀번호로 다시 로그인해 주세요/)).toBeInTheDocument();
    expect(mockChange).toHaveBeenCalledWith({ currentPassword: "old-pass", newPassword: "new-pass-1" });
    expect(mockLogout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "다시 로그인" }));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });
});
