import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberApprovalDecideDialog } from "./MemberApprovalDecideDialog";
import { decideStaffSignupRequest } from "../api";
import { ApiError } from "@/shared/lib/http";
import type { StaffSignupRequestItemResponseTypes } from "../types";

// A1 수정 라운드(조건 ②) — 조율자가 이 두 실패 갈래를 직접 심어 확인했을 때 기존 50개
// 검사 중 어느 것도 잡지 못했다(50/50 통과). 이 파일은 그 공백을 메운다: 서버가 승인·거절을
// 거부했을 때 오류 문구가 실제로 뜨는지, 그리고 onDone(목록 갱신+닫기)이 호출되지 않는지를 본다
// — 조용히 넘어가면 관리자가 처리된 줄 알고 다음 요청으로 넘어가는 형태의 결함이 된다.
vi.mock("../api", () => ({
  decideStaffSignupRequest: vi.fn(),
}));

const mockDecide = vi.mocked(decideStaffSignupRequest);

const request: StaffSignupRequestItemResponseTypes = {
  requestId: "7",
  name: "박대기",
  phone: "010-2222-3333",
  academy: { id: "4", code: "C97U7K5D", name: "A1검증학원", region: "서울" },
  requestedAt: "2026-09-10T09:00:00Z",
  academyStaffCount: 1,
};

describe("MemberApprovalDecideDialog — 승인·거절 실패 시 오류 표시", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("승인이 실패하면 오류 문구를 보여주고 onDone 을 호출하지 않는다", async () => {
    mockDecide.mockRejectedValue(new ApiError(409, "STAFF_QUOTA_EXCEEDED", "이미 정원이 찼습니다"));
    const onDone = vi.fn();
    render(<MemberApprovalDecideDialog request={request} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => expect(screen.getByText("이미 정원이 찼습니다")).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("거절이 실패하면 오류 문구를 보여주고 onDone 을 호출하지 않는다", async () => {
    mockDecide.mockRejectedValue(new ApiError(409, "APPROVAL_ALREADY_DECIDED", "이미 처리된 요청입니다"));
    const onDone = vi.fn();
    render(<MemberApprovalDecideDialog request={request} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "거절" }));
    fireEvent.change(screen.getByLabelText("거절 사유"), { target: { value: "서류 미비" } });
    fireEvent.click(screen.getByRole("button", { name: "거절 확정" }));

    await waitFor(() => expect(screen.getByText("이미 처리된 요청입니다")).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("승인이 성공하면 onDone 을 호출한다", async () => {
    mockDecide.mockResolvedValue({ accountStatus: "active", decidedAt: "2026-09-12T00:00:00Z" });
    const onDone = vi.fn();
    render(<MemberApprovalDecideDialog request={request} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockDecide).toHaveBeenCalledWith("7", { accept: true });
  });
});
