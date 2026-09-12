import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberApprovalsPage } from "./MemberApprovalsPage";
import { getStaffSignupRequests } from "../api";
import { ApiError } from "@/shared/lib/http";

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 가입 요청 목록 조회가
// 실패했을 때 오류 문구가 뜨는지를 본다.
//
// 이 검사를 만들면서 발견한 것(우려·확신 없는 지점) — 실패해도 requests 가 []로
// 떨어지므로 EmptyState("처리할 가입 요청이 없습니다")가 오류 배너와 동시에 뜬다.
// 관리자가 "진짜 0건"과 "조회 실패"를 문구만으로 구분하기 어렵다. 디자인 판단이
// 필요한 사안이라 이번 라운드에서 고치지 않고 그대로 보고한다.
vi.mock("../api", () => ({
  getStaffSignupRequests: vi.fn(),
}));

const mockGetRequests = vi.mocked(getStaffSignupRequests);

describe("MemberApprovalsPage — 목록 조회 실패", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("조회가 실패하면 오류 문구를 보여준다", async () => {
    mockGetRequests.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<MemberApprovalsPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
  });
});
