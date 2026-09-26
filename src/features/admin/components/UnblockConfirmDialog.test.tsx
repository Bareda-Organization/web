import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    render(<UnblockConfirmDialog account={account} onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByText("로그인 5회 연속 실패")).toBeInTheDocument();
    expect(screen.getByText("2026-09-10T09:00:00Z")).toBeInTheDocument();
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
