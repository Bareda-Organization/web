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

// F03-07 — 최근 로그인이 ISO 원문(`…Z`)으로 보였다.
describe("MemberAccountsPage — 최근 로그인 시각 표기", () => {
  afterEach(() => vi.clearAllMocks());

  it("최근 로그인은 한국 시간으로, 기록이 없으면 '기록 없음' 으로 보인다", async () => {
    mockGetAccounts.mockResolvedValue({
      items: [
        { accountId: "1", name: "김관계", loginId: "a", phone: "010", academyName: "가 학원", lastLoginAt: "2026-09-30T05:10:22Z", status: "active" },
        { accountId: "2", name: "이관계", loginId: "b", phone: "010", academyName: "나 학원", lastLoginAt: null, status: "active" },
      ],
      page: 1,
      size: 20,
      totalCount: 2,
      hasNext: false,
    } as never);
    render(<MemberAccountsPage />);

    expect(await screen.findByText("2026-09-30 14:10")).toBeInTheDocument();
    expect(screen.getByText("기록 없음")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-30T/)).not.toBeInTheDocument();
  });
});
