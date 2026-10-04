import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberAccountFormDialog } from "./MemberAccountFormDialog";
import { updateStaffAccount } from "../api";
import type { StaffAccountItemResponseTypes } from "../types";

vi.mock("../api", () => ({ updateStaffAccount: vi.fn() }));
const mockUpdate = vi.mocked(updateStaffAccount);

const account: StaffAccountItemResponseTypes = {
  accountId: "5", name: "김관계", loginId: "staffA", phone: "010-1111-2222", academyName: "바래다 학원", lastLoginAt: null, status: "active",
};

const setup = (overrides: Partial<StaffAccountItemResponseTypes> = {}) => {
  const onDone = vi.fn();
  render(<MemberAccountFormDialog account={{ ...account, ...overrides }} onClose={vi.fn()} onDone={onDone} />);
  return { onDone };
};

// F03-08 — 재직 해제(로그인 즉시 차단)·비밀번호 초기화는 되돌릴 수 없는 조작이라 확인 한 단계를 거친다.
describe("MemberAccountFormDialog — 확인·성공 표시·빈 값", () => {
  afterEach(() => vi.clearAllMocks());

  it("[재직 해제] 는 확인 창을 거치고, 취소하면 요청이 나가지 않는다", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "퇴사 처리" }));

    const confirm = screen.getByRole("dialog", { name: "재직을 해제할까요?" });
    expect(within(confirm).getByText(/로그인할 수 없게 됩니다/)).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();

    fireEvent.click(within(confirm).getByRole("button", { name: "취소" }));
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "퇴사 처리" })).toBeInTheDocument();
  });

  // R48 Ruling 807 — 퇴사 처리하면 그 학원의 관계자 자리가 비어 대기 중인 가입 요청을 승인할 수 있게 된다. 확인 창이 그 사실과 건수를 먼저 말한다.
  it("퇴사 확인 창은 자리가 비게 된다는 것과 승인 대기 가입 요청 건수를 알린다", () => {
    setup({ academyPendingSignupCount: 1 });
    fireEvent.click(screen.getByRole("button", { name: "퇴사 처리" }));

    const confirm = screen.getByRole("dialog", { name: "재직을 해제할까요?" });
    expect(within(confirm).getByText("이 학원의 관계자 자리가 비게 됩니다")).toBeInTheDocument();
    expect(within(confirm).getByText(/승인을 기다리는 가입 요청이 1건/)).toBeInTheDocument();
  });

  it("승인 대기 가입 요청이 없으면 그 건수를 지어내지 않는다", () => {
    setup({ academyPendingSignupCount: 0 });
    fireEvent.click(screen.getByRole("button", { name: "퇴사 처리" }));

    expect(screen.getByText(/승인을 기다리는 가입 요청은 없습니다/)).toBeInTheDocument();
  });

  it("확인하면 재직 해제를 보내고, 성공 문구를 보이며 버튼이 [재직 전환] 으로 바뀌어 같은 요청을 또 보내지 않는다", async () => {
    mockUpdate.mockResolvedValue({ accountId: "5" } as never);
    setup();
    fireEvent.click(screen.getByRole("button", { name: "퇴사 처리" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "재직을 해제할까요?" })).getByRole("button", { name: "재직 해제" }));

    expect(await screen.findByText("처리되었습니다")).toBeInTheDocument();
    expect(mockUpdate).toHaveBeenCalledWith("5", { status: "inactive" });
    expect(screen.getByRole("button", { name: "재직 전환" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "퇴사 처리" })).not.toBeInTheDocument();
  });

  it("[비밀번호 초기화] 도 확인을 거친 뒤 임시 비밀번호를 보여 준다", async () => {
    mockUpdate.mockResolvedValue({ accountId: "5", temporaryPassword: "Tmp-1234" } as never);
    setup();
    fireEvent.click(screen.getByRole("button", { name: "김관계 비밀번호 초기화" }));
    expect(mockUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "초기화 확정" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("5", { resetPassword: true }));
    expect(await screen.findByText(/Tmp-1234/)).toBeInTheDocument();
  });

  it("정보 저장이 성공하면 처리되었다고 알리고, 이름·연락처가 공백이면 저장할 수 없다", async () => {
    mockUpdate.mockResolvedValue({ accountId: "5" } as never);
    setup();
    const save = screen.getByRole("button", { name: "정보 저장" });
    const [nameInput, phoneInput] = screen.getAllByRole("textbox").filter((input) => !(input as HTMLInputElement).disabled);

    fireEvent.change(nameInput, { target: { value: "  " } });
    expect(save).toBeDisabled();
    fireEvent.change(nameInput, { target: { value: "김새이름" } });
    fireEvent.change(phoneInput, { target: { value: "" } });
    expect(save).toBeDisabled();
    fireEvent.change(phoneInput, { target: { value: "010-9999-0000" } });
    fireEvent.click(save);

    expect(await screen.findByText("처리되었습니다")).toBeInTheDocument();
    expect(mockUpdate).toHaveBeenCalledWith("5", { name: "김새이름", phone: "010-9999-0000", email: undefined });
  });
});
