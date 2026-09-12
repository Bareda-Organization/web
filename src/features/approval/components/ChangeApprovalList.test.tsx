import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangeApprovalList } from "./ChangeApprovalList";
import { getChangeApprovals } from "../api";
import type { ChangeApprovalsResponseTypes } from "../types";

// 실제 백엔드는 status=rejected·auto_rejected·all 에서 500 을 낸다(changeApprovals.ts
// 주석) — 이 화면이 그 값들을 절대 요청하지 않고 pending·approved 만 쓰는지가 이
// 결함 경로를 밟지 않는 유일한 방어선이다.
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

  it("기본 조회는 pending 만 요청하고 rejected·auto_rejected·all 은 절대 요청하지 않는다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);

    expect(await screen.findByText("이학생")).toBeInTheDocument();
    expect(mockGetChangeApprovals).toHaveBeenCalledWith("pending");
    expect(mockGetChangeApprovals).not.toHaveBeenCalledWith("rejected");
    expect(mockGetChangeApprovals).not.toHaveBeenCalledWith("auto_rejected");
    expect(mockGetChangeApprovals).not.toHaveBeenCalledWith("all");
  });

  it("승하차지 삭제 예정 건은 삭제 예정 배지를 보여준다", async () => {
    mockGetChangeApprovals.mockResolvedValue(baseList);
    render(<ChangeApprovalList />);

    expect(await screen.findByText("삭제 예정")).toBeInTheDocument();
  });
});
