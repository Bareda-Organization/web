import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangeApprovalList } from "./ChangeApprovalList";
import { getChangeApprovals } from "../api";
import type { ChangeApprovalsResponseTypes } from "../types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../api", () => ({
  getChangeApprovals: vi.fn(),
}));

const mockGetChangeApprovals = vi.mocked(getChangeApprovals);

const baseList: ChangeApprovalsResponseTypes = {
  items: [
    {
      approvalId: 5,
      source: "change_request",
      studentName: "이학생",
      runId: 10,
      busNo: "1호차",
      direction: "to_academy",
      deadlineAt: "2026-09-13T00:00:00Z",
      stopName: "정문",
      remainingRiders: 3,
      willRemoveStop: true,
      requestedAt: "2026-09-11T00:00:00Z",
    },
  ],
  pendingCount: 1,
};

describe("ChangeApprovalList — 상태 필터", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("기본 조회는 pending 을 요청한다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);

    expect(await screen.findByText("이학생")).toBeInTheDocument();
    expect(mockGetChangeApprovals).toHaveBeenCalledWith("pending");
  });

  // §9.6 ChangeRequest.status 4종 전부가 필터로 열려 있는지 — 병합 `ab51f8f`(Ruling 264)로
  // 서버 500 이 해소돼 UI 로 가리던 이전 판단을 되돌린 자리다.
  it("거절·자동 거절 탭을 선택하면 각각의 status 로 재조회한다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);
    await screen.findByText("이학생");

    fireEvent.click(screen.getByRole("tab", { name: "거절" }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("rejected");

    fireEvent.click(screen.getByRole("tab", { name: "자동 거절" }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("auto_rejected");
  });

  it("승하차지 삭제 예정 건은 삭제 예정 배지를 보여준다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);

    expect(await screen.findByText("삭제 예정")).toBeInTheDocument();
  });
});
