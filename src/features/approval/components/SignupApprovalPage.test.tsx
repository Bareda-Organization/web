import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupApprovalPage } from "./SignupApprovalPage";
import { getSignupRequests, decideSignupRequest } from "../api";
import type { SignupRequestsResponseTypes } from "../types";

// §5.2 는 role=student 수락 시 link.student_ids[] 가 없으면 422 LINK_REQUIRED 다 —
// role=parent 는 Ruling 324 로 이 조건에서 빠졌다(자녀 연결은 §3.3·§3.4 로 분리).
// 이 화면이 role 별로 다른 전송 payload 를 실제로 만드는지가 핵심 검증 대상이다.
vi.mock("../api", () => ({
  getSignupRequests: vi.fn(),
  decideSignupRequest: vi.fn(),
}));

const mockGetSignupRequests = vi.mocked(getSignupRequests);
const mockDecideSignupRequest = vi.mocked(decideSignupRequest);

const baseList: SignupRequestsResponseTypes = {
  items: [
    { requestId: 1, name: "김보호", role: "parent", phone: "010-1111-2222", requestedAt: "2026-09-10T00:00:00Z" },
  ],
  pendingCount: 1,
  page: 0,
  size: 20,
  totalCount: 1,
  hasNext: false,
};

describe("SignupApprovalPage — 목록 + 승인/거절", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("목록을 불러와 처리 대기 건수와 이름을 보여준다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    render(<SignupApprovalPage />);

    expect(await screen.findByText("김보호")).toBeInTheDocument();
    expect(screen.getByText("처리 대기 1건")).toBeInTheDocument();
    expect(mockGetSignupRequests).toHaveBeenCalledWith("pending");
  });

  it("role=parent 승인은 학생 ID 입력 없이 link 없이 decide 를 호출한다(Ruling 324)", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockResolvedValue({ accountStatus: "active", decidedAt: "2026-09-12T00:00:00Z" });
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "승인 확정" }));

    await waitFor(() =>
      expect(mockDecideSignupRequest).toHaveBeenCalledWith(1, {
        accept: true,
        link: undefined,
      }),
    );
  });

  it("거절은 사유를 채우지 않으면 확정 버튼이 비활성 상태다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    fireEvent.click(await screen.findByRole("button", { name: "거절" }));

    expect(screen.getByRole("button", { name: "거절 확정" })).toBeDisabled();
  });
});
