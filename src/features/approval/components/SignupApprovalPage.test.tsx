import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

// 처리 직후 사이드바 배지를 바로 다시 세는지만 본다 — 배지를 세는 쪽은 ApprovalPendingProvider.test 가 맡는다.
const mockRefreshPending = vi.fn(async () => true);
vi.mock("./ApprovalPendingProvider", () => ({
  useApprovalPending: () => ({ refresh: mockRefreshPending }),
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

    expect((await screen.findAllByText("김보호")).length).toBeGreaterThan(0);
    expect(screen.getByText(/처리 대기 1건/)).toBeInTheDocument();
    expect(mockGetSignupRequests).toHaveBeenCalledWith("pending", 0, 20);
  });

  it("role=parent 승인은 학생 ID 입력 없이 link 없이 decide 를 호출한다(Ruling 324)", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockResolvedValue({ accountStatus: "active", decidedAt: "2026-09-12T00:00:00Z" });
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

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

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    fireEvent.click(await screen.findByRole("button", { name: "거절" }));

    expect(screen.getByRole("button", { name: "가입 거절" })).toBeDisabled();
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

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    // 역할이 영문(student) 그대로 보이지 않는다
    expect(screen.queryByText(/student/)).not.toBeInTheDocument();
    expect(screen.getAllByText("학생").length).toBeGreaterThan(0);

    expect(screen.queryByLabelText(/학생 ID/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText(/김철수/));
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

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

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));

    await screen.findByLabelText(/박학생.*|학생/, { selector: "input[type=checkbox]" });
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

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    await screen.findByLabelText(/김철수/);

    expect(screen.getByRole("button", { name: "승인" })).toBeDisabled();
  });

  it("role=driver 승인은 매니저 목록에서 골라 그 매니저 ID 로 decide 를 호출한다", async () => {
    mockGetSignupRequests.mockResolvedValue({
      ...baseList,
      items: [{ ...baseList.items[0], requestId: "6", name: "최기사", role: "driver" }],
    });
    mockSearchManagers.mockResolvedValue([{ id: "31", name: "최기사(등록)", detail: "010-3333-4444" }]);
    mockDecideSignupRequest.mockResolvedValue({ accountStatus: "active", decidedAt: "2026-09-12T00:00:00Z" });
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    expect(screen.getAllByText("기사").length).toBeGreaterThan(0);

    expect(screen.queryByLabelText(/매니저 ID/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText(/최기사\(등록\)/));
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

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

    // 목록 칸과 처리 패널 두 곳에 같은 시각이 보인다.
    expect((await screen.findAllByText("2026-09-10 09:00")).length).toBeGreaterThan(0);
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

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    fireEvent.click(await screen.findByLabelText(/김철수/));
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    expect(await screen.findByText("이미 다른 계정과 연결된 학생입니다 — 다른 학생을 고르세요")).toBeInTheDocument();
    expect(screen.queryByText("server raw message")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/김철수/)).toBeEnabled();
    expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
  });

  it("기사 승인이 ALREADY_LINKED 로 거절되면 다른 매니저를 고르라는 문구를 보인다", async () => {
    mockGetSignupRequests.mockResolvedValue({
      ...baseList,
      items: [{ ...baseList.items[0], requestId: "6", name: "최기사", role: "driver" }],
    });
    mockSearchManagers.mockResolvedValue([{ id: "31", name: "최기사(등록)" }]);
    mockDecideSignupRequest.mockRejectedValue(new ApiError(409, "ALREADY_LINKED", "server raw message"));
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    fireEvent.click(await screen.findByLabelText(/최기사\(등록\)/));
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    expect(await screen.findByText("이미 다른 계정과 연결된 매니저입니다 — 다른 매니저를 고르세요")).toBeInTheDocument();
  });

  it("학부모 승인이 ALREADY_LINKED 로 거절되면 이미 연결된 자녀가 있다는 문구를 보인다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockRejectedValue(new ApiError(409, "ALREADY_LINKED", "server raw message"));
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

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
    expect(screen.queryAllByText("김보호")).toHaveLength(0);
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

    await screen.findAllByText("김보호");
    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    await waitFor(() => expect(mockGetSignupRequests).toHaveBeenLastCalledWith("pending", 1, 20));

    fireEvent.click(screen.getByText("거절됨"));
    await waitFor(() => expect(mockGetSignupRequests).toHaveBeenLastCalledWith("rejected", 0, 20));
  });
});

// Ruling 848 ② — §5.1 `status` 값은 pending · accepted · rejected 다. "승인 완료" 탭이 옛 계정 상태 값 `active` 를 보내 실서버가 422 VALIDATION_FAILED 로 거절했다.
describe("SignupApprovalPage — 승인 완료 탭 요청 값", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("승인 완료 탭은 status=accepted 로, 거절됨 탭은 status=rejected 로 요청한다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    render(<SignupApprovalPage />);
    await screen.findAllByText("김보호");

    fireEvent.click(screen.getByText("승인 완료"));
    await waitFor(() => expect(mockGetSignupRequests).toHaveBeenLastCalledWith("accepted", 0, 20));

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

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    expect(await screen.findByText("이미 다른 관계자가 처리한 요청입니다 — 목록을 새로 불러옵니다")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "승인" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(mockGetSignupRequests).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("김보호 가입 요청 처리")).not.toBeInTheDocument();
  });

  it("409 SIGNUP_TARGET_BLOCKED 면 차단된 계정이라 승인할 수 없다고 알린다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockRejectedValue(new ApiError(409, "SIGNUP_TARGET_BLOCKED", "blocked"));
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    expect(await screen.findByText("승인 대상 계정이 차단된 상태입니다 — 차단을 먼저 해제해야 승인할 수 있습니다")).toBeInTheDocument();
  });
});

// 가입 신청은 실시간 통지가 없어 배지를 새로 세는 길이 30초 폴링뿐이다 — 처리하고 나면 바로 다시 세야 한다.
describe("SignupApprovalPage — 처리 직후 사이드바 배지 갱신", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("승인하면 배지를 다시 센다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockResolvedValue({ accountStatus: "active", decidedAt: "2026-09-12T00:00:00Z" });
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() => expect(mockRefreshPending).toHaveBeenCalledTimes(1));
  });

  it("거절하면 배지를 다시 센다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockResolvedValue({ accountStatus: "rejected", decidedAt: "2026-09-12T00:00:00Z" });
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: /처리$/ }));
    fireEvent.click(await screen.findByRole("button", { name: "거절" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "서류 미비" } });
    fireEvent.click(screen.getByRole("button", { name: "가입 거절" }));

    await waitFor(() => expect(mockRefreshPending).toHaveBeenCalledTimes(1));
  });
});

describe("SignupApprovalPage — 오래 기다린 순 · 거절 대화상자(R48)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("서버가 최신순으로 줘도 목록은 오래 기다린 순이고 맨 위 요청이 오른쪽 패널에 열린다", async () => {
    mockGetSignupRequests.mockResolvedValue({
      ...baseList,
      items: [
        { requestId: "2", name: "나중신청", role: "parent", phone: "010-0000-0002", requestedAt: "2026-10-03T00:00:00Z" },
        { requestId: "1", name: "먼저신청", role: "parent", phone: "010-0000-0001", requestedAt: "2026-10-01T00:00:00Z" },
      ],
      pendingCount: 2,
      totalCount: 2,
    });
    render(<SignupApprovalPage />);

    expect(await screen.findByRole("region", { name: "먼저신청 가입 요청 처리" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("먼저신청");
    expect(rows[1]).toHaveTextContent("나중신청");
  });

  it("거절은 대화상자에서 받고 사유를 쓰면 그 사유로 decide 를 부른다", async () => {
    mockGetSignupRequests.mockResolvedValue(baseList);
    mockDecideSignupRequest.mockResolvedValue({ accountStatus: "rejected", decidedAt: "2026-10-03T00:00:00Z" });
    render(<SignupApprovalPage />);

    fireEvent.click(await screen.findByRole("button", { name: "거절" }));
    const dialog = screen.getByRole("dialog", { name: "김보호 가입 요청 거절" });
    expect(within(dialog).getByRole("button", { name: "가입 거절" })).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(/거절 사유/), { target: { value: "학원 기록에 없는 이름" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "가입 거절" }));

    await waitFor(() =>
      expect(mockDecideSignupRequest).toHaveBeenCalledWith("1", { accept: false, rejectReason: "학원 기록에 없는 이름" }),
    );
  });
});
