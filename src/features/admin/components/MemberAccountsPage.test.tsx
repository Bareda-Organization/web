import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberAccountsPage } from "./MemberAccountsPage";
import { getStaffAccounts } from "../api";
import { ApiError } from "@/shared/lib/http";

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 계정 목록 조회 실패 시
// 오류 문구가 뜨는지를 본다.
vi.mock("../api", () => ({
  getStaffAccounts: vi.fn(),
}));

const mockGetAccounts = vi.mocked(getStaffAccounts);

describe("MemberAccountsPage — 목록 조회 실패", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("조회가 실패하면 오류 문구를 보여준다", async () => {
    mockGetAccounts.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<MemberAccountsPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(screen.getByText("전체 0개 계정")).toBeInTheDocument();
  });
});
