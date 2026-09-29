import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupStatusPanel } from "./SignupStatusPanel";
import { getSignupStatus } from "../api";
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
