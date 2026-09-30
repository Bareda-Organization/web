import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApprovalPendingCard } from "./ApprovalPendingCard";
import type { ApprovalPending } from "./ApprovalPendingProvider";

let pending: ApprovalPending;
vi.mock("./ApprovalPendingProvider", () => ({ useApprovalPending: () => pending }));

const state = (overrides: Partial<ApprovalPending>): ApprovalPending => ({
  signupCount: 0,
  changeCount: 0,
  nextDeadlineAt: null,
  isReady: true,
  refresh: async () => true,
  ...overrides,
});

describe("ApprovalPendingCard", () => {
  afterEach(() => vi.useRealTimers());

  it("첫 조회 전에는 그리지 않는다", () => {
    pending = state({ isReady: false });
    const { container } = render(<ApprovalPendingCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("건수와 가장 이른 자동 거절까지 남은 시간을 보여 주고 각 승인 화면으로 이어진다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T09:00:00+09:00"));
    pending = state({ signupCount: 2, changeCount: 1, nextDeadlineAt: "2026-10-01T09:12:30+09:00" });

    render(<ApprovalPendingCard />);

    expect(screen.getByRole("link", { name: "가입 승인 2건" })).toHaveAttribute("href", "/signup-approval");
    expect(screen.getByRole("link", { name: "구간 변경 승인 1건" })).toHaveAttribute("href", "/change-approval");
    expect(screen.getByText("가장 이른 구간 변경 자동 거절까지 12분 30초")).toBeInTheDocument();
  });

  it("기한이 이미 지났으면 지났다고 알리고, 대기가 없으면 없다고 알린다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T09:30:00+09:00"));
    pending = state({ changeCount: 1, nextDeadlineAt: "2026-10-01T09:12:30+09:00" });
    const { unmount } = render(<ApprovalPendingCard />);
    expect(screen.getByText("기한이 지난 구간 변경 신청이 있습니다")).toBeInTheDocument();
    unmount();

    pending = state({});
    render(<ApprovalPendingCard />);
    expect(screen.getByText("처리할 승인 요청이 없습니다")).toBeInTheDocument();
  });
});
