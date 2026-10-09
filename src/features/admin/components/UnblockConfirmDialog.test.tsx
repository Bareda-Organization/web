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

  // R50 M4 — 관계자 가입은 같은 학원 관계자가 아니라 메인 관리자가 승인한다(AUTH-10 · O-02). 승인 주체를 역할로 가른다.
  it("승인 대기로 돌아가는 관계자 계정은 로그인은 되지만 메인 관리자가 승인하기 전에는 대기 화면만 열린다고 알린다", () => {
    render(<UnblockConfirmDialog account={{ ...account, role: "staff", statusBeforeBlock: "pending" }} onClose={vi.fn()} onDone={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "이관계 계정 차단 해제" });
    expect(within(dialog).getByText("해제 뒤 상태 — 승인 대기")).toBeInTheDocument();
    expect(within(dialog).getByText(/메인 관리자가 승인하기 전에는 승인 대기 화면만 열립니다/)).toBeInTheDocument();
    // API_SPEC §2.5 — pending 도 로그인은 성공한다. "로그인할 수 없다" 는 사양과 반대 문장
    expect(within(dialog).queryByText(/로그인할 수 없습니다/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/바래다 학원 관계자가 승인/)).not.toBeInTheDocument();
  });

  it("승인 대기로 돌아가는 학부모 계정은 소속 학원 관계자가 승인하기 전에는 대기 화면만 열린다고 알린다", () => {
    render(<UnblockConfirmDialog account={{ ...account, role: "parent", statusBeforeBlock: "pending" }} onClose={vi.fn()} onDone={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "이관계 계정 차단 해제" });
    expect(within(dialog).getByText(/바래다 학원 관계자가 승인하기 전에는 승인 대기 화면만 열립니다/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/메인 관리자가 승인/)).not.toBeInTheDocument();
  });

  it("가입이 거절된 상태로 돌아가는 계정은 사양 용어 '거절됨' 으로 적는다", () => {
    render(<UnblockConfirmDialog account={{ ...account, statusBeforeBlock: "rejected" }} onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByText("해제 뒤 상태 — 거절됨")).toBeInTheDocument();
    expect(screen.queryByText(/거부됨/)).not.toBeInTheDocument();
    // 거절도 로그인은 성공하고 대기 화면(거절 사유 · 재신청)에 고정된다 — API_SPEC §1.4
    expect(screen.getByText(/거절 상태 그대로라 가입 거절 안내 화면만 열립니다/)).toBeInTheDocument();
    expect(screen.queryByText(/로그인할 수 없/)).not.toBeInTheDocument();
  });

  it("활성으로 돌아가는 계정은 바로 로그인할 수 있다고만 알리고 승인 경고는 내지 않는다", () => {
    render(<UnblockConfirmDialog account={{ ...account, statusBeforeBlock: "active" }} onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByText("해제 뒤 상태 — 활성")).toBeInTheDocument();
    expect(screen.queryByText(/승인하기 전에는/)).not.toBeInTheDocument();
  });

  it("해제에 성공하면 처리 완료 토스트에 돌아간 상태와 승인 주체를 적는다(S-04 · R50 M4)", async () => {
    mockUnblockAccount.mockResolvedValue({ accountStatus: "active", unblockedBy: "1", unblockedAt: "2026-09-12T00:00:00Z" });
    render(
      <ToastProvider>
        <UnblockConfirmDialog account={{ ...account, role: "staff", statusBeforeBlock: "pending" }} onClose={vi.fn()} onDone={vi.fn()} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "차단 해제" }));

    expect(await screen.findByText("이관계 계정의 로그인 차단을 해제했습니다")).toBeInTheDocument();
    expect(screen.getByText(/'승인 대기' 상태로 돌아갔습니다/)).toBeInTheDocument();
    expect(screen.getByText(/메인 관리자의 승인을 받기 전에는 승인 대기 화면만 열립니다/)).toBeInTheDocument();
  });
});
