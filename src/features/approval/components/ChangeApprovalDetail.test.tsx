import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { ChangeApprovalDetail } from "./ChangeApprovalDetail";
import { decideChangeApproval, getChangeApprovalDetail } from "../api";
import type { ChangeApprovalDetailResponseTypes } from "../types";

// §5.6 은 approve=true 면 previewToken 이 필수다(불일치·만료는 409 PREVIEW_STALE) —
// 이 화면이 상세 조회로 받은 previewToken 을 그대로 승인 요청에 실어 보내는지가
// 핵심 검증 대상이다. reject 는 사유 없이 거절할 수 없다는 §8.3 규칙도 함께 본다.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("../api", () => ({
  getChangeApprovalDetail: vi.fn(),
  decideChangeApproval: vi.fn(),
}));

const mockGetDetail = vi.mocked(getChangeApprovalDetail);
const mockDecide = vi.mocked(decideChangeApproval);

const baseDetail: ChangeApprovalDetailResponseTypes = {
  approvalId: 5,
  source: "change_request",
  studentName: "이학생",
  runId: 10,
  busNo: "1호차",
  direction: "to_academy",
  deadlineAt: "2026-09-13T00:00:00Z",
  stopName: "정문",
  remainingRiders: 3,
  willRemoveStop: false,
  requestedAt: "2026-09-11T00:00:00Z",
  routePreview: {
    stopsBefore: [{ seq: 1, stopName: "정문", eta: "08:10" }],
    stopsAfter: [{ seq: 1, stopName: "후문", eta: "08:15" }],
    reordered: [],
    removed: [],
  },
  estTimeBefore: "08:10",
  estTimeAfter: "08:15",
  estDistanceBefore: 1200,
  estDistanceAfter: 1500,
  affectedStudents: [{ studentId: 1, name: "이학생" }],
  capacity: { studentCapacity: 20, assigned: 12 },
  previewToken: "token-abc",
  previewStale: false,
};

describe("ChangeApprovalDetail — 승인/거절", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("승인 시 상세 조회로 받은 previewToken 을 그대로 실어 보낸다", async () => {
    mockGetDetail.mockResolvedValue(baseDetail);
    mockDecide.mockResolvedValue({
      status: "approved",
      stopRemoved: false,
      routeVersion: 2,
      decidedBy: "staff-1",
      decidedAt: "2026-09-12T00:00:00Z",
    });
    render(<ChangeApprovalDetail approvalId={5} />);

    fireEvent.click(await screen.findByRole("button", { name: "승인" }));

    await waitFor(() =>
      expect(mockDecide).toHaveBeenCalledWith(5, { approve: true, previewToken: "token-abc" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/change-approval");
  });

  it("거절 사유가 없으면 거절 확정 버튼이 비활성 상태다", async () => {
    mockGetDetail.mockResolvedValue(baseDetail);
    render(<ChangeApprovalDetail approvalId={5} />);

    fireEvent.click(await screen.findByRole("button", { name: "거절" }));

    expect(screen.getByRole("button", { name: "거절 확정" })).toBeDisabled();
  });

  it("409 PREVIEW_STALE 응답을 받으면 오류 문구를 보여주고 상세를 다시 불러온다", async () => {
    mockGetDetail.mockResolvedValue(baseDetail);
    mockDecide.mockRejectedValue(new ApiError(409, "PREVIEW_STALE", "미리보기가 만료됐습니다"));
    render(<ChangeApprovalDetail approvalId={5} />);

    fireEvent.click(await screen.findByRole("button", { name: "승인" }));

    expect(await screen.findByText("미리보기가 만료됐습니다")).toBeInTheDocument();
    await waitFor(() => expect(mockGetDetail).toHaveBeenCalledTimes(2));
  });

  // 이미 결정된 건(routePreview 등이 전부 null) — 실서버 계약 시험이 잡은 결함(보고서 §1·§2)의
  // 고정 시험. 이 널을 못 다루면 `stopsBefore` 접근에서 TypeError 로 렌더가 죽는다.
  it("이미 결정된 건(routePreview 가 null)은 노선 비교 대신 안내 문구를 보여주고 승인/거절 버튼을 감춘다", async () => {
    mockGetDetail.mockResolvedValue({
      ...baseDetail,
      routePreview: null,
      estTimeBefore: null,
      estTimeAfter: null,
      estDistanceBefore: null,
      estDistanceAfter: null,
      previewToken: null,
    });
    render(<ChangeApprovalDetail approvalId={5} />);

    expect(await screen.findByText("이미 결정된 건이라 노선 재계산 결과가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "거절" })).not.toBeInTheDocument();
  });
});
