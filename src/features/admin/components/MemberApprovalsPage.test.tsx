import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberApprovalsPage } from "./MemberApprovalsPage";
import { getStaffSignupRequests } from "../api";
import { ApiError } from "@/shared/lib/http";

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 가입 요청 목록 조회가
// 실패했을 때 오류 문구가 뜨는지를 본다.
//
// FE-R2 W 목표 1 — 조회가 실패하면 requests 가 []로 떨어져 EmptyState("처리할 가입
// 요청이 없습니다")가 오류 배너와 동시에 뜨던 것을 고쳤다(MemberApprovalsPage.tsx
// !error 가드). 아래 두 번째 검사가 그 가드를 고정한다 — 가드를 지우면 이 검사만
// 실패해야 한다.
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

  it("조회가 실패하면 EmptyState 는 뜨지 않는다 — '정말 0건' 과 '조회 실패' 를 구별한다", async () => {
    mockGetRequests.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<MemberApprovalsPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(screen.queryByText("처리할 가입 요청이 없습니다")).not.toBeInTheDocument();
  });
});

// 정원이 찬 학원(재직 관계자 1명 이상)의 요청은 승인할 수 없다 — 열어 보기 전에 목록에서 알아본다.
describe("MemberApprovalsPage — 정원이 찬 학원 표시", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const row = (requestId: string, academyName: string, academyStaffCount: number) => ({
    requestId,
    name: `신청자${requestId}`,
    phone: "010-1111-2222",
    academy: { id: requestId, code: `C${requestId}`, name: academyName, region: "서울" },
    requestedAt: "2026-09-10T09:00:00Z",
    academyStaffCount,
  });

  it("재직 관계자가 있는 학원의 행에만 정원 표시를 붙인다", async () => {
    mockGetRequests.mockResolvedValue({
      items: [row("1", "꽉찬학원", 1), row("2", "빈학원", 0)],
      page: 0,
      size: 20,
      totalCount: 2,
      hasNext: false,
    });
    render(<MemberApprovalsPage />);

    const fullRow = (await screen.findByText("꽉찬학원 (서울)")).closest("tr") as HTMLElement;
    const emptyRow = screen.getByText("빈학원 (서울)").closest("tr") as HTMLElement;
    expect(within(fullRow).getByText("정원 참")).toBeInTheDocument();
    expect(within(emptyRow).queryByText("정원 참")).not.toBeInTheDocument();
  });
});
