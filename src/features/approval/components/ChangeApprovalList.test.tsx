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
      approvalId: "5",
      source: "change_request",
      studentName: "이학생",
      runId: "10",
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
  page: 0,
  size: 20,
  totalCount: 1,
  hasNext: false,
};

describe("ChangeApprovalList — 상태 필터", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("기본 조회는 pending 을 0 페이지·size 20 으로 요청한다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);

    expect(await screen.findByText("이학생")).toBeInTheDocument();
    expect(mockGetChangeApprovals).toHaveBeenCalledWith("pending", 0, 20);
  });

  // §9.6 ChangeRequest.status 4종 전부가 필터로 열려 있는지 — 병합 `ab51f8f`(Ruling 264)로
  // 서버 500 이 해소돼 UI 로 가리던 이전 판단을 되돌린 자리다.
  it("거절·자동 거절 탭을 선택하면 각각의 status 로 0 페이지에서 재조회한다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);
    await screen.findByText("이학생");

    fireEvent.click(screen.getByRole("tab", { name: "거절" }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("rejected", 0, 20);

    fireEvent.click(screen.getByRole("tab", { name: "자동 거절" }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("auto_rejected", 0, 20);
  });

  // Ruling 358 — §5.5 목록 페이징. 다음 페이지 버튼은 같은 status 로 page+1 을 요청하고,
  // 그 뒤 상태 필터를 바꾸면 페이지가 0 으로 되돌아간다(옛 필터의 마지막 페이지가 새
  // 필터에서는 범위 밖일 수 있다 — 선례 NotificationList 와 같은 근거).
  it("다음 페이지 버튼은 page+1 로 재조회하고, 필터를 바꾸면 0 페이지로 되돌아간다", async () => {
    mockGetChangeApprovals.mockResolvedValue({ ...baseList, hasNext: true, totalCount: 25 });
    render(<ChangeApprovalList />);
    await screen.findByText("이학생");

    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("pending", 1, 20);

    fireEvent.click(screen.getByRole("tab", { name: "거절" }));
    expect(mockGetChangeApprovals).toHaveBeenLastCalledWith("rejected", 0, 20);
  });

  it("승하차지 삭제 예정 건은 삭제 예정 배지를 보여준다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);

    expect(await screen.findByText("삭제 예정")).toBeInTheDocument();
  });
});
