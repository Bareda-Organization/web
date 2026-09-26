import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BlockedAccountsPage } from "./BlockedAccountsPage";
import { getBlockedAccounts } from "../api";
import type { BlockedAccountItemResponseTypes } from "../types";

// W6 — API_SPEC §6.10 이 목록에 role · status_before_block 을 추가했다(`Ruling
// 328`). 해제하면 그 값으로 되돌아간다는 걸 해제 버튼을 누르기 전에 미리
// 보여줘야 한다(`UF-O-03`).
vi.mock("../api", () => ({
  getBlockedAccounts: vi.fn(),
}));

const mockGetBlockedAccounts = vi.mocked(getBlockedAccounts);

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
