import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { SignupApprovalPage } from "./SignupApprovalPage";
import { getSignupRequests, decideSignupRequest, searchStudentCandidates, searchManagerCandidates } from "../api";
import type { SignupRequestsResponseTypes } from "../types";

// §5.2 는 role=student 수락 시 link.student_ids[] 가 없으면 422 LINK_REQUIRED 다 —
// role=parent 는 Ruling 324 로 이 조건에서 빠졌다(자녀 연결은 §3.3·§3.4 로 분리).
// 이 화면이 role 별로 다른 전송 payload 를 실제로 만드는지가 핵심 검증 대상이다.
vi.mock("../api", () => ({
  getSignupRequests: vi.fn(),
  decideSignupRequest: vi.fn(),
  searchStudentCandidates: vi.fn(),
  searchManagerCandidates: vi.fn(),
}));

const mockGetSignupRequests = vi.mocked(getSignupRequests);
const mockDecideSignupRequest = vi.mocked(decideSignupRequest);
const mockSearchStudents = vi.mocked(searchStudentCandidates);
const mockSearchManagers = vi.mocked(searchManagerCandidates);

const baseList: SignupRequestsResponseTypes = {
  items: [
    { requestId: "1", name: "김보호", role: "parent", phone: "010-1111-2222", requestedAt: "2026-09-10T00:00:00Z" },
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
    expect(mockGetSignupRequests).toHaveBeenCalledWith("pending", 0, 20);
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
      expect(mockDecideSignupRequest).toHaveBeenCalledWith("1", {
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
  // R32-W3·W4 — 학생·기사·동승자 승인이 ID 직접 입력이라 목록에 ID 가 안 보이는 화면에서 사실상 승인이 불가능했다.
  it("role=student 승인은 ID 입력칸 없이 이름 검색 목록에서 골라 그 학생 ID 로 decide 를 호출한다", async () => {
    mockGetSignupRequests.mockResolvedValue({
      ...baseList,
      items: [{ ...baseList.items[0], requestId: "5", name: "박학생", role: "student" }],
    });
    mockSearchStudents.mockResolvedValue([
      { id: "77", name: "김철수", detail: "초등 3반" },
      { id: "78", name: "김영희" },
    ]);
    mockDecideSignupRequest.mockResolvedValue({ accountStatus: "active", decidedAt: "2026-09-12T00:00:00Z" });
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    // 역할이 영문(student) 그대로 보이지 않는다
    expect(screen.queryByText(/student/)).not.toBeInTheDocument();
    expect(screen.getByText(/학생 · 010-1111-2222/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));

    expect(screen.queryByLabelText(/학생 ID/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText(/김철수/));
    fireEvent.click(screen.getByRole("button", { name: "승인 확정" }));

    await waitFor(() =>
      expect(mockDecideSignupRequest).toHaveBeenCalledWith("5", { accept: true, link: { studentIds: ["77"] } }),
    );
  });

  // B1 #14 — 신청자는 자기 이름으로 가입했으니 관계자가 같은 이름을 다시 치지 않게 후보 검색을 그 이름으로 시작한다.
  it("학생·기사 승인은 신청자 이름으로 먼저 후보를 검색한다", async () => {
    mockGetSignupRequests.mockResolvedValue({
      ...baseList,
      items: [{ ...baseList.items[0], requestId: "5", name: "박학생", role: "student" }],
    });
    mockSearchStudents.mockResolvedValue([{ id: "77", name: "박학생" }]);
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));

    await screen.findByLabelText(/박학생/);
    expect(mockSearchStudents).toHaveBeenCalledWith("박학생");
    expect(screen.getByPlaceholderText("학생 이름으로 검색")).toHaveValue("박학생");
  });

  it("학생을 하나도 고르지 않으면 승인 확정이 비활성이다", async () => {
    mockGetSignupRequests.mockResolvedValue({
      ...baseList,
      items: [{ ...baseList.items[0], requestId: "5", name: "박학생", role: "student" }],
    });
    mockSearchStudents.mockResolvedValue([{ id: "77", name: "김철수" }]);
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    await screen.findByLabelText(/김철수/);

    expect(screen.getByRole("button", { name: "승인 확정" })).toBeDisabled();
  });

  it("role=driver 승인은 매니저 목록에서 골라 그 매니저 ID 로 decide 를 호출한다", async () => {
    mockGetSignupRequests.mockResolvedValue({
      ...baseList,
      items: [{ ...baseList.items[0], requestId: "6", name: "최기사", role: "driver" }],
    });
    mockSearchManagers.mockResolvedValue([{ id: "31", name: "최기사(등록)", detail: "010-3333-4444" }]);
    mockDecideSignupRequest.mockResolvedValue({ accountStatus: "active", decidedAt: "2026-09-12T00:00:00Z" });
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    expect(screen.getByText(/기사 · 010-1111-2222/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));

    expect(screen.queryByLabelText(/매니저 ID/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText(/최기사\(등록\)/));
    fireEvent.click(screen.getByRole("button", { name: "승인 확정" }));

    await waitFor(() =>
      expect(mockDecideSignupRequest).toHaveBeenCalledWith("6", { accept: true, link: { managerId: "31" } }),
    );
  });
});

// R32-W9 — 신청 일시가 서버의 ISO 원문으로 보였다.
describe("SignupApprovalPage — 시각 표기(R32-W9)", () => {
  afterEach(() => vi.clearAllMocks());

  it("신청 일시를 ISO 원문이 아니라 한국 시간으로 보여준다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList); // requestedAt 2026-09-10T00:00:00Z
    render(<SignupApprovalPage />);

    expect(await screen.findByText("2026-09-10 09:00")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-10T/)).not.toBeInTheDocument();
  });
});

// FE7(R36-FE) — 이미 다른 계정과 연결된 학생·매니저를 골라 승인하면 서버가 409 ALREADY_LINKED 로 거절한다.
// 서버 원문 대신 역할에 맞는 쉬운 문구를 보이고, 대화상자는 열린 채 선택을 고칠 수 있어야 한다.
describe("SignupApprovalPage — 이미 연결된 대상(ALREADY_LINKED)", () => {
  afterEach(() => vi.clearAllMocks());

  it("학생 승인이 ALREADY_LINKED 로 거절되면 다른 학생을 고르라는 문구를 보이고 선택을 고칠 수 있다", async () => {
    mockGetSignupRequests.mockResolvedValue({
      ...baseList,
      items: [{ ...baseList.items[0], requestId: "5", name: "박학생", role: "student" }],
    });
    mockSearchStudents.mockResolvedValue([{ id: "77", name: "김철수" }]);
    mockDecideSignupRequest.mockRejectedValue(new ApiError(409, "ALREADY_LINKED", "server raw message"));
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    fireEvent.click(await screen.findByLabelText(/김철수/));
    fireEvent.click(screen.getByRole("button", { name: "승인 확정" }));

    expect(await screen.findByText("이미 다른 계정과 연결된 학생입니다 — 다른 학생을 고르세요")).toBeInTheDocument();
    expect(screen.queryByText("server raw message")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/김철수/)).toBeEnabled();
    expect(screen.getByRole("button", { name: "승인 확정" })).toBeEnabled();
  });

  it("기사 승인이 ALREADY_LINKED 로 거절되면 다른 매니저를 고르라는 문구를 보인다", async () => {
    mockGetSignupRequests.mockResolvedValue({
      ...baseList,
      items: [{ ...baseList.items[0], requestId: "6", name: "최기사", role: "driver" }],
    });
    mockSearchManagers.mockResolvedValue([{ id: "31", name: "최기사(등록)" }]);
    mockDecideSignupRequest.mockRejectedValue(new ApiError(409, "ALREADY_LINKED", "server raw message"));
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    fireEvent.click(await screen.findByLabelText(/최기사\(등록\)/));
    fireEvent.click(screen.getByRole("button", { name: "승인 확정" }));

    expect(await screen.findByText("이미 다른 계정과 연결된 매니저입니다 — 다른 매니저를 고르세요")).toBeInTheDocument();
  });

  it("학부모 승인이 ALREADY_LINKED 로 거절되면 이미 연결된 자녀가 있다는 문구를 보인다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockRejectedValue(new ApiError(409, "ALREADY_LINKED", "server raw message"));
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    fireEvent.click(screen.getByRole("button", { name: "승인 확정" }));

    expect(await screen.findByText("이미 연결된 자녀가 있습니다")).toBeInTheDocument();
  });
});

// F02-04 — 탭을 연달아 눌러 요청이 겹칠 때, 늦게 도착한 옛 응답이 새 탭의 목록을 덮으면 안 된다.
describe("SignupApprovalPage — F02-04 늦게 온 옛 응답", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("처리 대기 응답이 거절됨 응답보다 늦게 와도 표에는 거절됨 목록이 남는다", async () => {
    let resolvePending!: (value: SignupRequestsResponseTypes) => void;
    mockGetSignupRequests.mockImplementationOnce(
      () => new Promise<SignupRequestsResponseTypes>((resolve) => (resolvePending = resolve)),
    );
    mockGetSignupRequests.mockResolvedValueOnce({
      ...baseList,
      items: [{ ...baseList.items[0], requestId: "2", name: "거절된사람" }],
    });
    render(<SignupApprovalPage />);

    fireEvent.click(screen.getByText("거절됨"));
    await screen.findByText("거절된사람");
    await act(async () => resolvePending(baseList));

    expect(screen.getByText("거절된사람")).toBeInTheDocument();
    expect(screen.queryByText("김보호")).not.toBeInTheDocument();
  });
});

// F02-03 — 20건을 넘는 요청은 다음 쪽으로 넘겨 볼 수 있어야 한다(§5.1 페이징).
describe("SignupApprovalPage — F02-03 페이징", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("다음 쪽이 있으면 [다음] 으로 1쪽을 요청하고, 탭을 바꾸면 0쪽으로 돌아간다", async () => {
    mockGetSignupRequests.mockResolvedValue({ ...baseList, totalCount: 45, hasNext: true });
    render(<SignupApprovalPage />);

    await screen.findByText("김보호");
    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    await waitFor(() => expect(mockGetSignupRequests).toHaveBeenLastCalledWith("pending", 1, 20));

    fireEvent.click(screen.getByText("거절됨"));
    await waitFor(() => expect(mockGetSignupRequests).toHaveBeenLastCalledWith("rejected", 0, 20));
  });
});

// F02-06 — 다른 관계자가 먼저 처리한 요청을 결정하면 서버가 거절한다. 예전 목록에 그 요청이 남지 않게 닫으면서 목록을 새로 받는다.
describe("SignupApprovalPage — F02-06 결정 실패 뒤 목록 새로 고침", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("409 APPROVAL_ALREADY_DECIDED 면 한국어 안내를 보이고, [닫기] 가 목록을 다시 불러온다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockRejectedValue(new ApiError(409, "APPROVAL_ALREADY_DECIDED", "Already decided"));
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    fireEvent.click(screen.getByRole("button", { name: "승인 확정" }));

    expect(await screen.findByText("이미 다른 관계자가 처리한 요청입니다 — 목록을 새로 불러옵니다")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "승인 확정" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(mockGetSignupRequests).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("김보호 가입 요청 처리")).not.toBeInTheDocument();
  });

  it("409 SIGNUP_TARGET_BLOCKED 면 차단된 계정이라 승인할 수 없다고 알린다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockRejectedValue(new ApiError(409, "SIGNUP_TARGET_BLOCKED", "blocked"));
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "처리" }));
    fireEvent.click(await screen.findByRole("button", { name: "승인" }));
    fireEvent.click(screen.getByRole("button", { name: "승인 확정" }));

    expect(await screen.findByText("승인 대상 계정이 차단된 상태입니다 — 차단을 먼저 해제해야 승인할 수 있습니다")).toBeInTheDocument();
  });
});
