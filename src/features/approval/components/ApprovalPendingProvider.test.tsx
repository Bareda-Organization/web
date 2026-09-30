import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSocketEnvelope } from "@/shared/lib/ws";
import { getChangeApprovals, getSignupRequests } from "../api";
import type { ChangeApprovalSummaryResponseTypes } from "../types";
import { ApprovalPendingProvider, useApprovalPending } from "./ApprovalPendingProvider";

vi.mock("../api", () => ({ getSignupRequests: vi.fn(), getChangeApprovals: vi.fn() }));

let emitEnvelope: (envelope: WebSocketEnvelope) => void = () => {};
vi.mock("@/shared/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks")>()),
  useRealtimeChannel: (_destination: string, onEnvelope: (envelope: WebSocketEnvelope) => void) => {
    emitEnvelope = onEnvelope;
    return { connectionState: "connected", reconnect: vi.fn() };
  },
}));

const mockSignups = vi.mocked(getSignupRequests);
const mockChanges = vi.mocked(getChangeApprovals);

const change = (approvalId: string, deadlineAt: string) => ({ approvalId, deadlineAt }) as ChangeApprovalSummaryResponseTypes;
const signupPage = (pendingCount: number) => ({ items: [], pendingCount, page: 0, size: 1, totalCount: pendingCount, hasNext: false });
const changePage = (pendingCount: number, items: ChangeApprovalSummaryResponseTypes[]) => ({
  items,
  pendingCount,
  page: 0,
  size: 20,
  totalCount: pendingCount,
  hasNext: false,
});

const Probe = () => {
  const { signupCount, changeCount, nextDeadlineAt, isReady } = useApprovalPending();
  return (
    <p>
      {isReady ? "준비" : "대기"} 가입 {signupCount} · 구간 {changeCount} · 기한 {nextDeadlineAt ?? "없음"}
    </p>
  );
};

const renderProvider = () =>
  render(
    <ApprovalPendingProvider academyId="7">
      <Probe />
    </ApprovalPendingProvider>,
  );

describe("ApprovalPendingProvider", () => {
  beforeEach(() => {
    mockSignups.mockReset();
    mockChanges.mockReset();
  });

  it("기존 목록 API 의 pendingCount 로 두 대기 건수를 세고, 가장 이른 기한을 고른다", async () => {
    mockSignups.mockResolvedValue(signupPage(3));
    mockChanges.mockResolvedValue(
      changePage(2, [change("a", "2026-10-01T09:30:00+09:00"), change("b", "2026-10-01T09:10:00+09:00")]),
    );

    renderProvider();

    await waitFor(() =>
      expect(screen.getByText("준비 가입 3 · 구간 2 · 기한 2026-10-01T09:10:00+09:00")).toBeInTheDocument(),
    );
    expect(mockSignups).toHaveBeenCalledWith("pending", 0, 1);
    expect(mockChanges).toHaveBeenCalledWith("pending", 0, 20);
  });

  it("approval_requested 를 받으면 폴링을 기다리지 않고 바로 다시 센다", async () => {
    mockSignups.mockResolvedValue(signupPage(0));
    mockChanges.mockResolvedValueOnce(changePage(0, []));
    renderProvider();
    await waitFor(() => expect(screen.getByText(/준비 가입 0 · 구간 0/)).toBeInTheDocument());

    mockChanges.mockResolvedValue(changePage(1, [change("n", "2026-10-01T10:00:00+09:00")]));
    await act(async () => emitEnvelope({ event: "approval_requested" } as WebSocketEnvelope));

    await waitFor(() => expect(screen.getByText(/구간 1/)).toBeInTheDocument());
  });

  it("조회에 실패하면 이미 센 건수를 지우지 않는다", async () => {
    mockSignups.mockResolvedValueOnce(signupPage(2));
    mockChanges.mockResolvedValueOnce(changePage(1, [change("a", "2026-10-01T09:30:00+09:00")]));
    renderProvider();
    await waitFor(() => expect(screen.getByText(/가입 2 · 구간 1/)).toBeInTheDocument());

    mockSignups.mockRejectedValue(new Error("network"));
    await act(async () => emitEnvelope({ event: "approval_requested" } as WebSocketEnvelope));

    expect(screen.getByText(/가입 2 · 구간 1/)).toBeInTheDocument();
  });
});
