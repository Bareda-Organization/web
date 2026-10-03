import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockedAccountsPage } from "./BlockedAccountsPage";
import { getBlockedAccounts, unblockAccount } from "../api";
import type { BlockedAccountItemResponseTypes } from "../types";

// W6 — API_SPEC §6.10 이 목록에 role · status_before_block 을 추가했다(`Ruling
// 328`). 해제하면 그 값으로 되돌아간다는 걸 해제 버튼을 누르기 전에 미리
// 보여줘야 한다(`UF-O-03`).
vi.mock("../api", () => ({
  getBlockedAccounts: vi.fn(),
  unblockAccount: vi.fn(),
}));

// 해제 직후 사이드바 차단 배지를 바로 다시 세는지만 본다 — 배지를 세는 쪽은 AdminPendingProvider.test 가 맡는다.
const mockRefreshPending = vi.fn(async () => true);
vi.mock("./AdminPendingProvider", () => ({
  useAdminPending: () => ({ signupCount: 0, blockedCount: 0, isReady: true, refresh: mockRefreshPending }),
}));

const mockGetBlockedAccounts = vi.mocked(getBlockedAccounts);
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
  statusBeforeBlock: "pending",
};

describe("BlockedAccountsPage — W6 역할·해제 후 상태 열", () => {
  it("role·status_before_block 을 목록 열로 보여준다", async () => {
    mockGetBlockedAccounts.mockResolvedValue({ items: [account], page: 1, size: 20, totalCount: 1, hasNext: false });

    render(<BlockedAccountsPage />);

    await screen.findByText("이관계");
    expect(screen.getByText("학원 관계자")).toBeInTheDocument();
    expect(screen.getByText("승인 대기")).toBeInTheDocument();
  });
});

describe("BlockedAccountsPage — 해제 직후 사이드바 배지 갱신", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("차단을 해제하면 배지를 다시 센다", async () => {
    mockGetBlockedAccounts.mockResolvedValue({ items: [account], page: 1, size: 20, totalCount: 1, hasNext: false });
    mockUnblockAccount.mockResolvedValue({ accountStatus: "active", unblockedBy: "1", unblockedAt: "2026-09-12T00:00:00Z" });
    render(<BlockedAccountsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "차단 해제" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "차단 해제" }));

    await waitFor(() => expect(mockRefreshPending).toHaveBeenCalledTimes(1));
  });
});
