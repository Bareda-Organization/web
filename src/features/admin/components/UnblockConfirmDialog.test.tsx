import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/shared/ui";
import { UnblockConfirmDialog } from "./UnblockConfirmDialog";
import { unblockAccount } from "../api";
import type { BlockedAccountItemResponseTypes } from "../types";

// §6.12, BRIEF-a1.md §4.2 — "누가 왜 차단됐는지 보이지 않으면 판단할 수 없다".
// 그래서 이 검사는 확정 버튼이 있는지가 아니라, 확정하기 *전에* 차단 사유·시각·
// 실패 횟수가 화면에 실제로 노출되는지를 본다.
vi.mock("../api", () => ({
  unblockAccount: vi.fn(),
}));

const mockUnblockAccount = vi.mocked(unblockAccount);

const account: BlockedAccountItemResponseTypes = {
  accountId: "5",
  loginId: "staffA",
  name: "이관계",
  academyName: "바래다 학원",
  blockedAt: "2026-09-10T09:00:00Z",
  failedAttempts: 5,
  reason: "로그인 5회 연속 실패",
  role: "staff",
  statusBeforeBlock: "active",
};

describe("UnblockConfirmDialog — 차단 근거 노출 후 해제", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("차단 사유·시각·실패 횟수를 확인 화면에 표시한다", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T12:00:00+09:00"));
    render(<UnblockConfirmDialog account={account} onClose={vi.fn()} onDone={vi.fn()} />);
    vi.useRealTimers();

    expect(screen.getByText("로그인 5회 연속 실패")).toBeInTheDocument();
    // F03-07 — ISO 원문이 아니라 한국 시간 표기(UTC 09:00 = 서울 18:00)
    expect(screen.getByText(/9월 10일 18:00/)).toBeInTheDocument();
    expect(screen.getByText("5회")).toBeInTheDocument();
    expect(screen.getByText("바래다 학원")).toBeInTheDocument();
  });

  it("해제를 확정하면 accountId 로 unblockAccount 를 호출하고 완료 콜백을 부른다", async () => {
    mockUnblockAccount.mockResolvedValue({
      accountStatus: "active",
      unblockedBy: "sysadmin",
      unblockedAt: "2026-09-12T00:00:00Z",
    });
    const onDone = vi.fn();
    render(<UnblockConfirmDialog account={account} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "차단 해제" }));

    await waitFor(() => expect(mockUnblockAccount).toHaveBeenCalledWith("5"));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});

// R48 Ruling 328 — 해제는 로그인 차단만 푼다. 차단 직전 상태로 돌아가므로 "승인 대기" 계정은 해제해도 쓸 수 없다는 것을 확정 전에 말한다.
describe("UnblockConfirmDialog — 해제 뒤 상태 경고(Ruling 328)", () => {
  afterEach(() => vi.clearAllMocks());

  it("승인 대기로 돌아가는 계정은 해제 뒤에도 승인 전에는 로그인할 수 없다고 경고한다", () => {
    render(<UnblockConfirmDialog account={{ ...account, statusBeforeBlock: "pending" }} onClose={vi.fn()} onDone={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "이관계 계정 차단 해제" });
    expect(within(dialog).getByText("해제 뒤 상태 — 승인 대기")).toBeInTheDocument();
    expect(within(dialog).getByText(/승인하기 전에는 로그인할 수 없습니다/)).toBeInTheDocument();
  });

  it("활성으로 돌아가는 계정은 바로 로그인할 수 있다고만 알리고 승인 경고는 내지 않는다", () => {
    render(<UnblockConfirmDialog account={{ ...account, statusBeforeBlock: "active" }} onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByText("해제 뒤 상태 — 활성")).toBeInTheDocument();
    expect(screen.queryByText(/승인하기 전에는 로그인할 수 없습니다/)).not.toBeInTheDocument();
  });

  it("해제에 성공하면 처리 완료 토스트에 돌아간 상태를 적는다(S-04)", async () => {
    mockUnblockAccount.mockResolvedValue({ accountStatus: "active", unblockedBy: "1", unblockedAt: "2026-09-12T00:00:00Z" });
    render(
      <ToastProvider>
        <UnblockConfirmDialog account={{ ...account, statusBeforeBlock: "pending" }} onClose={vi.fn()} onDone={vi.fn()} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "차단 해제" }));

    expect(await screen.findByText("이관계 계정의 로그인 차단을 해제했습니다")).toBeInTheDocument();
    expect(screen.getByText(/'승인 대기' 상태로 돌아갔습니다/)).toBeInTheDocument();
  });
});
