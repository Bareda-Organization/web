import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberApprovalDecidePanel } from "./MemberApprovalDecidePanel";
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

// 재직 관계자가 없는 학원 — 승인 버튼이 열려 있다. 아래 409 시험은 "목록을 연 뒤 다른 관리자가 먼저 승인한" 경우다.
const request: StaffSignupRequestItemResponseTypes = {
  requestId: "7",
  name: "박대기",
  phone: "010-2222-3333",
  academy: { id: "4", code: "C97U7K5D", name: "A1검증학원", region: "서울" },
  requestedAt: "2026-09-10T09:00:00Z",
  academyStaffCount: 0,
};

// 재직 관계자가 이미 1명인 학원 — 학원당 1명 정원이 차서(API_SPEC §6.5) 승인은 서버가 409 STAFF_QUOTA_EXCEEDED 로 거부한다.
const quotaFullRequest: StaffSignupRequestItemResponseTypes = { ...request, academyStaffCount: 1 };

describe("MemberApprovalDecidePanel — 승인·거절 실패 시 오류 표시", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("승인이 실패하면 오류 문구를 보여주고 onDone 을 호출하지 않는다", async () => {
    mockDecide.mockRejectedValue(new ApiError(409, "STAFF_QUOTA_EXCEEDED", "이미 정원이 찼습니다"));
    const onDone = vi.fn();
    render(<MemberApprovalDecidePanel request={request} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => expect(screen.getByText("이미 정원이 찼습니다")).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("거절이 실패하면 오류 문구를 보여주고 onDone 을 호출하지 않는다", async () => {
    mockDecide.mockRejectedValue(new ApiError(409, "APPROVAL_ALREADY_DECIDED", "이미 처리된 요청입니다"));
    const onDone = vi.fn();
    render(<MemberApprovalDecidePanel request={request} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "거절" }));
    fireEvent.change(screen.getByLabelText("거절 사유"), { target: { value: "서류 미비" } });
    fireEvent.click(screen.getByRole("button", { name: "가입 거절" }));

    await waitFor(() => expect(screen.getByText("이미 처리된 요청입니다")).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("승인이 성공하면 onDone 을 호출한다", async () => {
    mockDecide.mockResolvedValue({ accountStatus: "active", decidedAt: "2026-09-12T00:00:00Z" });
    const onDone = vi.fn();
    render(<MemberApprovalDecidePanel request={request} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockDecide).toHaveBeenCalledWith("7", { accept: true });
  });
});

// 정원이 찬 학원은 승인 버튼을 눌러 보기 전에 알려야 한다 — 눌러서야 409 를 보면 관리자는 왜 안 되는지, 무엇을 해야 하는지 모른다.
describe("MemberApprovalDecidePanel — 학원 정원이 찬 경우", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("승인 버튼을 끄고, 기존 관계자를 퇴사 처리하라는 안내와 계정 관리 링크를 보여준다", () => {
    render(<MemberApprovalDecidePanel request={quotaFullRequest} onDone={vi.fn()} />);

    expect(screen.getByRole("button", { name: "승인" })).toBeDisabled();
    expect(screen.getByText("지금은 승인할 수 없습니다")).toBeInTheDocument();
    expect(screen.getByText(/이미 재직 중인 관계자가 있습니다/)).toBeInTheDocument();
    // 꺼진 승인 단추 아래에 켜지는 조건을 적는다(U-05).
    expect(screen.getByText(/승인은 위 1번을 마치면 켜집니다/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "계정 관리에서 퇴사 처리" })).toHaveAttribute("href", "/member-accounts?academy=4");
  });

  it("정원이 차도 거절은 할 수 있다", async () => {
    mockDecide.mockResolvedValue({ accountStatus: "rejected", decidedAt: "2026-09-12T00:00:00Z" });
    const onDone = vi.fn();
    render(<MemberApprovalDecidePanel request={quotaFullRequest} onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "거절" }));
    fireEvent.change(screen.getByLabelText("거절 사유"), { target: { value: "정원 초과" } });
    fireEvent.click(screen.getByRole("button", { name: "가입 거절" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockDecide).toHaveBeenCalledWith("7", { accept: false, rejectReason: "정원 초과" });
  });

  it("정원이 안 찬 학원에는 안내를 띄우지 않고 승인 버튼이 열려 있다", () => {
    render(<MemberApprovalDecidePanel request={request} onDone={vi.fn()} />);

    expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
    expect(screen.queryByText(/이미 재직 중인 관계자가 있습니다/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "계정 관리에서 퇴사 처리" })).not.toBeInTheDocument();
  });
});

// R48 Ruling 807 — 승인이 막힌 이유(누가 재직 중인가)와 푸는 방법(그 사람 퇴사 처리)이 한 화면에 있어야 한다.
describe("MemberApprovalDecidePanel — 재직 관계자 안내(Ruling 807)", () => {
  afterEach(() => vi.clearAllMocks());

  it("current_staff 가 있으면 이름 · 아이디를 보이고 안내 1번에 그 이름을 쓴다", () => {
    const withStaff = { ...quotaFullRequest, currentStaff: { name: "이수민", loginId: "staffB", lastLoginAt: null } };
    render(<MemberApprovalDecidePanel request={withStaff} onDone={vi.fn()} />);

    expect(screen.getByText(/staffB/)).toBeInTheDocument();
    expect(screen.getByText(/기존 관계자 이수민을 퇴사 처리/)).toBeInTheDocument();
  });

  it("거절 사유가 비어 있으면 가입 거절 단추가 꺼지고 요청은 나가지 않는다", () => {
    render(<MemberApprovalDecidePanel request={request} onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "거절" }));

    expect(screen.getByRole("dialog", { name: "박대기 가입 요청 거절" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가입 거절" })).toBeDisabled();
    expect(mockDecide).not.toHaveBeenCalled();
  });
});
