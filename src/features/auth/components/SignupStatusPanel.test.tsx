import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupStatusPanel } from "./SignupStatusPanel";
import { getSignupStatus, reapplySignup, searchAcademies } from "../api";
import { useAuthSession } from "../hooks/useAuthSession";
import type { SignupStatusResponseTypes } from "../types";

// 보고서 4항의 오타 예시("status === 'rejected' 를 'pending' 으로") 그 자체를 겨냥한다.
// pending 과 rejected 는 같은 컴포넌트 안에서 완전히 다른 블록(거절 사유·재신청 진입점)을
// 켜고 끄므로, 상태값 하나만 틀려도 화면이 반대로 나온다 — 그 갈림을 여기서 고정한다.
vi.mock("../api", () => ({
  getSignupStatus: vi.fn(),
  reapplySignup: vi.fn(),
  searchAcademies: vi.fn(),
}));

vi.mock("../hooks/useAuthSession", () => ({
  useAuthSession: vi.fn(),
}));

const mockGetSignupStatus = vi.mocked(getSignupStatus);
const mockUseAuthSession = vi.mocked(useAuthSession);

const baseStatus: SignupStatusResponseTypes = {
  status: "pending",
  academy: { name: "바래다 A", region: "서울", code: "BARAEDA-A" },
  requestedAt: "2026-09-01T00:00:00Z",
  academyContact: "02-1234-5678",
};

describe("SignupStatusPanel — 승인 상태별 분기", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("pending 은 대기 문구만 보여주고 거절 사유·재신청 버튼은 없다", async () => {
    mockGetSignupStatus.mockResolvedValue(baseStatus);
    mockUseAuthSession.mockReturnValue({
      bootstrapStatus: "ready",
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
    render(<SignupStatusPanel />);

    expect(await screen.findByText("승인 대기 중입니다")).toBeInTheDocument();
    expect(screen.queryByText("가입이 거절됐습니다")).not.toBeInTheDocument();
    expect(screen.queryByText("거절 사유")).not.toBeInTheDocument();
    expect(screen.queryByText("다른 학원으로 재신청")).not.toBeInTheDocument();
  });

  it("rejected 는 거절 사유와 재신청 버튼을 보여준다", async () => {
    mockGetSignupStatus.mockResolvedValue({
      ...baseStatus,
      status: "rejected",
      rejectReason: "재학증명서 미제출",
    });
    mockUseAuthSession.mockReturnValue({
      bootstrapStatus: "ready",
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
    render(<SignupStatusPanel />);

    expect(await screen.findByText("가입이 거절됐습니다")).toBeInTheDocument();
    expect(screen.getByText("재학증명서 미제출")).toBeInTheDocument();
    expect(screen.getByText("다른 학원으로 재신청")).toBeInTheDocument();
    expect(screen.queryByText("승인 대기 중입니다")).not.toBeInTheDocument();
  });
});

// BR-301(Ruling 781) — 학원이 대표 연락처를 등록하지 않으면 academy_contact 가 null 이다. 빈 칸 대신 대체 문구.
describe("SignupStatusPanel — 학원 문의처(BR-301)", () => {
  afterEach(() => vi.clearAllMocks());

  it("문의처가 null 이면 '등록된 문의처 없음' 을 보여준다", async () => {
    mockGetSignupStatus.mockResolvedValue({ ...baseStatus, academyContact: null });
    setupSession();
    render(<SignupStatusPanel />);

    expect(await screen.findByText("등록된 문의처 없음")).toBeInTheDocument();
  });

  it("문의처가 있으면 그 값을 보여주고 대체 문구는 없다", async () => {
    mockGetSignupStatus.mockResolvedValue(baseStatus);
    setupSession();
    render(<SignupStatusPanel />);

    expect(await screen.findByText("02-1234-5678")).toBeInTheDocument();
    expect(screen.queryByText("등록된 문의처 없음")).not.toBeInTheDocument();
  });
});

// R32-W14 — 승인 상태를 불러오지 못했을 때 화면에 누를 것이 없어, 새로고침 말고는 복구 수단이 없었다.
describe("SignupStatusPanel — 불러오기 실패(R32-W14)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("불러오기에 실패하면 '다시 시도' 버튼이 있고, 누르면 다시 불러와 상태를 보여준다", async () => {
    mockGetSignupStatus.mockRejectedValueOnce(new Error("network"));
    mockGetSignupStatus.mockResolvedValueOnce(baseStatus);
    mockUseAuthSession.mockReturnValue({
      bootstrapStatus: "ready",
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshSession: vi.fn(),
    });
    render(<SignupStatusPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("승인 대기 중입니다")).toBeInTheDocument();
    expect(mockGetSignupStatus).toHaveBeenCalledTimes(2);
  });
});

const setupSession = (overrides: Partial<ReturnType<typeof useAuthSession>> = {}) => {
  const value = {
    bootstrapStatus: "ready" as const,
    session: null,
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshSession: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
  mockUseAuthSession.mockReturnValue(value);
  return value;
};

// F03-02 — UF-X-02: 대기·거절 화면에서 [상태 다시 확인] 으로 승인 여부를 다시 묻는다.
describe("SignupStatusPanel — 상태 다시 확인", () => {
  afterEach(() => vi.clearAllMocks());

  it("[상태 다시 확인] 은 세션(/me)과 가입 상태를 다시 조회한다 — 승인되면 세션 갱신으로 가드가 홈으로 옮긴다", async () => {
    mockGetSignupStatus.mockResolvedValue(baseStatus);
    const session = setupSession();
    render(<SignupStatusPanel />);
    await screen.findByText("승인 대기 중입니다");

    fireEvent.click(screen.getByRole("button", { name: "상태 다시 확인" }));

    await waitFor(() => expect(session.refreshSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockGetSignupStatus).toHaveBeenCalledTimes(2));
  });

  it("다시 확인이 실패하면 오류를 알리고, 이미 승인(active)이면 '승인 대기 중' 을 그리지 않는다", async () => {
    mockGetSignupStatus.mockResolvedValueOnce(baseStatus).mockResolvedValueOnce({ ...baseStatus, status: "active" });
    setupSession();
    render(<SignupStatusPanel />);
    await screen.findByText("승인 대기 중입니다");

    fireEvent.click(screen.getByRole("button", { name: "상태 다시 확인" }));

    expect(await screen.findByText("승인되었습니다")).toBeInTheDocument();
    expect(screen.queryByText("승인 대기 중입니다")).not.toBeInTheDocument();
  });
});

// F03-03·F03-14 — 재신청: 검색 오류 처리 · 확인 한 단계 · 키보드 선택 · 로그아웃 오류
describe("SignupStatusPanel — 재신청", () => {
  afterEach(() => vi.clearAllMocks());

  const openReapply = async (session = setupSession()) => {
    mockGetSignupStatus.mockResolvedValue({ ...baseStatus, status: "rejected", rejectReason: "사유" });
    render(<SignupStatusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "다른 학원으로 재신청" }));
    return session;
  };
  const search = async () => {
    fireEvent.change(screen.getByPlaceholderText("학원명 또는 학원 코드로 검색"), { target: { value: "학" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
  };

  it("학원 검색이 실패하면 오류 문구를 보여준다", async () => {
    await openReapply();
    vi.mocked(searchAcademies).mockRejectedValue(new Error("network"));
    await search();

    expect(await screen.findByText("학원 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
  });

  it("결과 행을 눌러도 바로 재신청하지 않고 확인을 한 번 거친다 — 취소하면 요청이 나가지 않는다", async () => {
    await openReapply();
    vi.mocked(searchAcademies).mockResolvedValue([{ id: "9", name: "새학원", region: "서울", code: "N9" }]);
    await search();

    fireEvent.click(await screen.findByRole("button", { name: /새학원/ }));
    expect(vi.mocked(reapplySignup)).not.toHaveBeenCalled();
    expect(screen.getByText("이 학원으로 재신청할까요?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(vi.mocked(reapplySignup)).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /새학원/ }));
    fireEvent.click(screen.getByRole("button", { name: "재신청" }));
    await waitFor(() => expect(vi.mocked(reapplySignup)).toHaveBeenCalledWith("9"));
  });

  it("재신청은 들어갔는데 뒤이은 상태 재조회만 실패하면 '재신청 실패' 라고 하지 않는다", async () => {
    const session = await openReapply(setupSession({ refreshSession: vi.fn().mockRejectedValue(new Error("일시 오류")) }));
    vi.mocked(searchAcademies).mockResolvedValue([{ id: "9", name: "새학원", region: "서울", code: "N9" }]);
    vi.mocked(reapplySignup).mockResolvedValue({ status: "pending", requestedAt: "t" });
    await search();
    fireEvent.click(await screen.findByRole("button", { name: /새학원/ }));
    fireEvent.click(screen.getByRole("button", { name: "재신청" }));

    await waitFor(() => expect(session.refreshSession).toHaveBeenCalled());
    expect(screen.queryByText(/재신청에 실패했습니다/)).not.toBeInTheDocument();
  });

  it("로그아웃이 던져도 처리되지 않은 거절로 남지 않는다", async () => {
    setupSession({ logout: vi.fn().mockRejectedValue(new Error("network")) });
    mockGetSignupStatus.mockResolvedValue(baseStatus);
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    render(<SignupStatusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "로그아웃" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    process.off("unhandledRejection", unhandled);

    expect(unhandled).not.toHaveBeenCalled();
  });
});
