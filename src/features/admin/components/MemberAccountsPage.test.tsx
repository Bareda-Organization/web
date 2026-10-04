import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemberAccountsPage } from "./MemberAccountsPage";
import { getAllAcademies, getStaffAccounts } from "../api";
import { ApiError } from "@/shared/lib/http";

// A1 수정 라운드(조건 ②) — 이 화면도 실패 갈래 검사가 없었다. 계정 목록 조회 실패 시
// 오류 문구가 뜨는지를 본다.
vi.mock("../api", () => ({
  getStaffAccounts: vi.fn(),
  getAllAcademies: vi.fn(),
}));

const mockGetAccounts = vi.mocked(getStaffAccounts);
const mockGetAllAcademies = vi.mocked(getAllAcademies);

const account = (id: string, patch: Record<string, unknown> = {}) => ({
  accountId: id,
  name: `관계자${id}`,
  loginId: `staff${id}`,
  phone: "010-0000-0000",
  academyName: `학원${id}`,
  lastLoginAt: null,
  status: "active" as const,
  ...patch,
});

describe("MemberAccountsPage — 목록 조회 실패", () => {
  beforeEach(() => mockGetAllAcademies.mockResolvedValue([]));
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("조회가 실패하면 오류 문구를 보여준다", async () => {
    mockGetAccounts.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 처리 중 오류가 발생했습니다"));
    render(<MemberAccountsPage />);

    await waitFor(() => expect(screen.getByText("서버 처리 중 오류가 발생했습니다")).toBeInTheDocument());
    expect(screen.queryByText("전체 0개 계정")).not.toBeInTheDocument(); // 건수를 모르는 상태를 0 으로 보이지 않는다(Ruling 597)
  });
});

// F03-07 — 최근 로그인이 ISO 원문(`…Z`)으로 보였다.
describe("MemberAccountsPage — 최근 로그인 시각 표기", () => {
  beforeEach(() => mockGetAllAcademies.mockResolvedValue([]));
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

    expect(await screen.findByText("9월 30일 14:10")).toBeInTheDocument();
    expect(screen.getByText("기록 없음")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-30T/)).not.toBeInTheDocument();
  });
});

// R48 Ruling 807 — 탭 건수는 서버 counts, 학원 · 검색 · 재직 상태는 요청 쿼리로 간다.
describe("MemberAccountsPage — 탭 건수와 필터(Ruling 807)", () => {
  beforeEach(() => {
    mockGetAllAcademies.mockResolvedValue([{ id: "7", code: "C7", name: "새봄영어학원", region: "부천", staffCount: 1, userCount: 3, status: "active" }]);
    mockGetAccounts.mockResolvedValue({
      counts: { active: 3, inactive: 2 },
      items: [account("1", { academyId: "7", academyPendingSignupCount: 1 })],
      page: 0,
      size: 20,
      totalCount: 1,
      hasNext: false,
    });
  });
  afterEach(() => vi.clearAllMocks());

  it("탭 건수는 서버 counts 를 그대로 쓰고(현재 쪽 길이가 아니라), 재직 해제 탭을 누르면 status=inactive 로 읽는다", async () => {
    render(<MemberAccountsPage />);

    expect(await screen.findByRole("tab", { name: "재직 중 3건" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "재직 해제 2건" })).toBeInTheDocument();
    expect(mockGetAccounts).toHaveBeenLastCalledWith({ page: 0, size: 20 }, { academyId: undefined, q: undefined, status: "active" });

    fireEvent.click(screen.getByRole("tab", { name: "재직 해제 2건" }));
    await waitFor(() => expect(mockGetAccounts).toHaveBeenLastCalledWith({ page: 0, size: 20 }, { academyId: undefined, q: undefined, status: "inactive" }));
  });

  it("학원을 고르면 academy_id 가 요청에 실리고, 행에 가입 대기 칩이 붙는다", async () => {
    render(<MemberAccountsPage />);
    const row = (await screen.findByText("관계자1")).closest("tr") as HTMLElement;
    expect(within(row).getByText("가입 대기 1")).toBeInTheDocument();

    fireEvent.change(await screen.findByRole("combobox", { name: "학원" }), { target: { value: "7" } });

    await waitFor(() => expect(mockGetAccounts).toHaveBeenLastCalledWith({ page: 0, size: 20 }, { academyId: "7", q: undefined, status: "active" }));
  });
});
