import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberApprovalsPage } from "./MemberApprovalsPage";
import { decideStaffSignupRequest, getStaffSignupRequests } from "../api";
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
  decideStaffSignupRequest: vi.fn(),
}));

// 처리 직후 사이드바 배지를 바로 다시 세는지만 본다 — 배지를 세는 쪽은 AdminPendingProvider.test 가 맡는다.
const mockRefreshPending = vi.fn(async () => true);
vi.mock("./AdminPendingProvider", () => ({
  useAdminPending: () => ({ signupCount: 0, blockedCount: 0, isReady: true, refresh: mockRefreshPending }),
}));

const mockGetRequests = vi.mocked(getStaffSignupRequests);
const mockDecide = vi.mocked(decideStaffSignupRequest);

const row = (requestId: string, academyName: string, academyStaffCount: number) => ({
  requestId,
  name: `신청자${requestId}`,
  phone: "010-1111-2222",
  academy: { id: requestId, code: `C${requestId}`, name: academyName, region: "서울" },
  requestedAt: "2026-09-10T09:00:00Z",
  academyStaffCount,
});

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

// R50 M6 — O-02 · UF-O-06 "처리 대기 요청에 붙여 오래 기다린 요청을 구분". 신청 일시 옆에 서울 날짜 기준 N일째를 보인다(신청 당일 = 1일째).
describe("MemberApprovalsPage — 대기 일수(R50 M6)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("목록의 신청 일시 옆에 N일째를 보인다 — 자정 직전 신청은 다음 날 0시 1분에 2일째", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T00:01:00+09:00"));
    mockGetRequests.mockResolvedValue({
      items: [{ ...row("1", "가학원", 0), requestedAt: "2026-10-02T23:59:00+09:00" }, { ...row("2", "나학원", 0), requestedAt: "2026-10-03T00:00:30+09:00" }],
      page: 0,
      size: 20,
      totalCount: 2,
      hasNext: false,
    });
    render(<MemberApprovalsPage />);

    const table = await screen.findByRole("table");
    expect(await within(table).findByText("(2일째)")).toBeInTheDocument();
    expect(within(table).getByText("(1일째)")).toBeInTheDocument();
  });
});

// 정원이 찬 학원(재직 관계자 1명 이상)의 요청은 승인할 수 없다 — 열어 보기 전에 목록에서 알아본다.
describe("MemberApprovalsPage — 정원이 찬 학원 표시", () => {
  afterEach(() => {
    vi.clearAllMocks();
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

    const table = within(await screen.findByRole("table"));
    const fullRow = table.getByText("꽉찬학원").closest("tr") as HTMLElement;
    const emptyRow = table.getByText("빈학원").closest("tr") as HTMLElement;
    expect(within(fullRow).getByText("정원 참")).toBeInTheDocument();
    expect(within(emptyRow).queryByText("정원 참")).not.toBeInTheDocument();
  });
});

// 처리하고 나면 사이드바 "가입 승인" 배지가 30초 폴링을 기다리지 않고 바로 줄어야 한다.
describe("MemberApprovalsPage — 처리 직후 사이드바 배지 갱신", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const openDecideDialog = async () => {
    mockGetRequests.mockResolvedValue({ items: [row("1", "빈학원", 0)], page: 0, size: 20, totalCount: 1, hasNext: false });
    render(<MemberApprovalsPage />);
    await screen.findByRole("region", { name: "신청자1 처리" });
  };

  it("승인하면 배지를 다시 센다", async () => {
    mockDecide.mockResolvedValue({ accountStatus: "active", decidedAt: "2026-09-12T00:00:00Z" });
    await openDecideDialog();

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => expect(mockRefreshPending).toHaveBeenCalledTimes(1));
  });

  it("거절하면 배지를 다시 센다", async () => {
    mockDecide.mockResolvedValue({ accountStatus: "rejected", decidedAt: "2026-09-12T00:00:00Z" });
    await openDecideDialog();

    fireEvent.click(screen.getByRole("button", { name: "거절" }));
    fireEvent.change(screen.getByLabelText(/거절 사유/), { target: { value: "서류 미비" } });
    fireEvent.click(screen.getByRole("button", { name: "가입 거절" }));

    await waitFor(() => expect(mockRefreshPending).toHaveBeenCalledTimes(1));
  });
});

// R48 시안 `member-approvals` — 목록 + 오른쪽 처리 칸. 처음에는 첫 요청이 선택돼 있고, 행의 [처리] 로 다른 요청을 고른다.
describe("MemberApprovalsPage — 오른쪽 처리 칸", () => {
  afterEach(() => vi.clearAllMocks());

  it("첫 요청이 처음부터 선택돼 있고, 다른 행의 처리 단추를 누르면 처리 칸이 그 요청으로 바뀐다", async () => {
    mockGetRequests.mockResolvedValue({ items: [row("1", "꽉찬학원", 1), row("2", "빈학원", 0)], page: 0, size: 20, totalCount: 2, hasNext: false });
    render(<MemberApprovalsPage />);

    const panel = await screen.findByRole("region", { name: "신청자1 처리" });
    expect(within(panel).getByRole("button", { name: "승인" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "신청자2 가입 요청 처리" }));

    const next = screen.getByRole("region", { name: "신청자2 처리" });
    expect(within(next).getByRole("button", { name: "승인" })).toBeEnabled();
  });

  it("요청이 없으면 빈 상태와 계정 관리 보기 링크를 보인다", async () => {
    mockGetRequests.mockResolvedValue({ items: [], page: 0, size: 20, totalCount: 0, hasNext: false });
    render(<MemberApprovalsPage />);

    expect(await screen.findByText("처리할 가입 요청이 없습니다")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "계정 관리 보기" })).toHaveAttribute("href", "/member-accounts");
  });
});
