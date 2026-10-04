import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentList } from "./StudentList";
import { getStudents } from "../api";
import { ApiError } from "@/shared/lib/http";

// §5.11 신설 필드 guardian_count — 표의 "보호자 연결" 열이 0 은 "미연결", 1 이상은
// "연결 N명" 으로 보여야 한다. guardian_phone 유무로 추론하지 않는다는 것을 함께 본다
// (미연결 행은 guardianPhone 도 null 이지만, 검사 대상은 guardianCount 문구다).
vi.mock("../api", () => ({
  getStudents: vi.fn(),
}));
// 등록 창은 저장 완료만 흉내 낸다 — 저장한 학생의 id 를 목록에 넘기는 흐름만 본다.
vi.mock("./StudentForm", () => ({
  StudentForm: ({ onDone }: { onDone: (savedStudentId?: string) => void }) => (
    <div role="dialog" aria-label="학생 등록 창">
      <button type="button" onClick={() => onDone("9")}>
        저장 완료
      </button>
    </div>
  ),
}));

const mockGetStudents = vi.mocked(getStudents);

describe("StudentList — 보호자 연결 열", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("guardian_count 가 0 이면 미연결, 2 면 연결 2명 을 보여준다", async () => {
    mockGetStudents.mockResolvedValue({
      items: [
        {
          studentId: "1",
          name: "미연결학생",
          className: null,
          guardianPhone: null,
          guardianCount: 0,
          grade: null,
          canGoAlone: false,
          accountLinked: false,
          weeklyAddressStatus: "none" as const,
        },
        {
          studentId: "2",
          name: "다자녀학생",
          className: null,
          guardianPhone: "010-1000-0001",
          guardianCount: 2,
          grade: null,
          canGoAlone: false,
          accountLinked: false,
          weeklyAddressStatus: "none" as const,
        },
      ],
      page: 0,
      size: 20,
      totalCount: 2,
      hasNext: false,
    });

    render(<StudentList />);

    // 보호자 연락처 칸: 미연결 행은 "보호자 미연결", 연결 행은 "2명 연결"(학생 앱 칸의 "미연결" 칩과 구별된다).
    await waitFor(() => expect(screen.getAllByText("보호자 미연결").length).toBeGreaterThan(0));
    expect(screen.getByText("2명 연결")).toBeInTheDocument();
  });
});

// F02-04 — 검색을 제출했을 때 앞선 요청의 응답이 더 늦게 도착해도 검색 결과가 덮이면 안 된다.
describe("StudentList — F02-04 늦게 온 옛 응답", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const listOf = (name: string) => ({
    items: [{ studentId: "1", name, className: null, guardianPhone: null, guardianCount: 0, grade: null, canGoAlone: false, accountLinked: false, weeklyAddressStatus: "none" as const }],
    page: 0,
    size: 20,
    totalCount: 1,
    hasNext: false,
  });

  it("첫 조회 응답이 검색 응답보다 늦게 와도 표에는 검색 결과가 남는다", async () => {
    let resolveFirst!: (value: ReturnType<typeof listOf>) => void;
    mockGetStudents.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)));
    mockGetStudents.mockResolvedValueOnce(listOf("검색된학생"));
    render(<StudentList />);

    fireEvent.change(screen.getByPlaceholderText("이름으로 검색"), { target: { value: "검색" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByText("검색된학생");
    await act(async () => resolveFirst(listOf("옛목록학생")));

    expect(screen.getByText("검색된학생")).toBeInTheDocument();
    expect(screen.queryByText("옛목록학생")).not.toBeInTheDocument();
  });

  it("2쪽에서 검색해도 같은 검색 요청이 두 번 나가지 않는다", async () => {
    mockGetStudents.mockResolvedValue({ ...listOf("가나다"), page: 1, hasNext: true, totalCount: 40 });
    render(<StudentList />);
    await screen.findByText("가나다");
    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    await waitFor(() => expect(mockGetStudents).toHaveBeenLastCalledWith(1, 20, undefined, { className: undefined, filter: undefined }));
    mockGetStudents.mockClear();

    fireEvent.change(screen.getByPlaceholderText("이름으로 검색"), { target: { value: "검색" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    await waitFor(() => expect(mockGetStudents).toHaveBeenCalled());
    await act(async () => {});
    expect(mockGetStudents.mock.calls.filter((call) => call[2] === "검색")).toHaveLength(1);
  });
});

const emptyPage = { items: [], page: 0, size: 20, totalCount: 0, hasNext: false };

// B1 #11 — 조회 실패 때 "총 0명"·"표시할 내용이 없습니다"·"총 0건" 이 오류 배너와 같이 떠 실제로 0명인 것으로 읽혔다.
describe("StudentList — 조회 실패", () => {
  it("실패하면 오류만 보여 주고 0명·빈 목록·0건 문구는 내지 않는다", async () => {
    mockGetStudents.mockRejectedValue(new ApiError(503, "UNAVAILABLE", "서버 오류"));
    render(<StudentList />);

    expect(await screen.findByText("서버 오류")).toBeInTheDocument();
    // 처음부터 못 읽으면 지표 · 탭 · 필터 없이 오류 화면 하나(시안 student--error) — [다시 시도] 가 있다.
    expect(screen.getByText("학생 목록을 불러오지 못했습니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(screen.queryByText("표시할 내용이 없습니다")).not.toBeInTheDocument();
    expect(screen.queryByText(/총 0건/)).not.toBeInTheDocument();
    expect(screen.queryByText("재원 학생")).not.toBeInTheDocument();
  });
});

// B1 #12 — 검색이 0건이면 "표시할 내용이 없습니다" 만 떠서 검색어 탓인지 학생이 없는지 알 수 없었다.
describe("StudentList — 검색 결과 없음", () => {
  it("검색어를 넣어 0건이면 그 검색어와 함께 검색 결과가 없다고 알린다", async () => {
    mockGetStudents.mockResolvedValue({ ...emptyPage, totalCount: 35 });
    render(<StudentList />);
    await screen.findAllByText(/35명/);
    mockGetStudents.mockResolvedValue(emptyPage);

    fireEvent.change(screen.getByPlaceholderText("이름으로 검색"), { target: { value: "없는이름" } });
    fireEvent.click(screen.getByRole("button", { name: /검색/ }));

    expect(await screen.findByText("'없는이름' 검색 결과가 없습니다")).toBeInTheDocument();
    expect(screen.getByText("'없는이름' 검색 결과 0명")).toBeInTheDocument();
  });
});

// R46-FUWEB B1 #11 — 목록을 못 읽으면 새로고침 말고는 되돌릴 길이 없었다.
describe("StudentList — 다시 시도", () => {
  beforeEach(() => mockGetStudents.mockReset());

  it("조회에 실패하면 다시 시도 버튼이 있고, 누르면 다시 조회해 목록이 나온다", async () => {
    mockGetStudents.mockRejectedValueOnce(new ApiError(503, "UNAVAILABLE", "서버 오류"));
    render(<StudentList />);
    await screen.findByText("서버 오류");

    mockGetStudents.mockResolvedValue({
      ...emptyPage,
      items: [{ studentId: "1", name: "복구학생", className: null, guardianPhone: null, guardianCount: 0, grade: null, canGoAlone: false, accountLinked: false, weeklyAddressStatus: "none" as const }],
      totalCount: 1,
    });
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("복구학생")).toBeInTheDocument();
    expect(mockGetStudents).toHaveBeenCalledTimes(2);
  });
});

// R46-FUWEB B1 #12·#19 — 학생이 없을 때 다음 행동을 알려 주고, 저장한 학생의 행을 잠깐 강조한다.
describe("StudentList — 빈 상태 행동과 저장 행 강조", () => {
  it("학생이 한 명도 없으면 학생 등록 버튼이 보이고, 저장하면 새로 생긴 그 행이 강조된다", async () => {
    mockGetStudents.mockResolvedValue(emptyPage);
    render(<StudentList />);
    expect(await screen.findByText("등록된 학생이 없습니다")).toBeInTheDocument();

    mockGetStudents.mockResolvedValue({
      ...emptyPage,
      items: [
        { studentId: "8", name: "기존학생", className: null, guardianPhone: null, guardianCount: 0, grade: null, canGoAlone: false, accountLinked: false, weeklyAddressStatus: "none" as const },
        { studentId: "9", name: "새학생", className: null, guardianPhone: null, guardianCount: 0, grade: null, canGoAlone: false, accountLinked: false, weeklyAddressStatus: "none" as const },
      ],
      totalCount: 2,
    });
    const emptyRow = screen.getByText("등록된 학생이 없습니다").closest("tr")!;
    fireEvent.click(within(emptyRow).getByRole("button", { name: "학생 등록" }));
    fireEvent.click(await screen.findByRole("button", { name: "저장 완료" }));

    const newRow = (await screen.findByText("새학생")).closest("tr")!;
    expect(newRow).toHaveAttribute("data-highlighted", "true");
    expect(screen.getByText("기존학생").closest("tr")).not.toHaveAttribute("data-highlighted");
  });

  it("검색 결과가 없을 때는 학생 등록 버튼을 내지 않는다", async () => {
    mockGetStudents.mockResolvedValue({ ...emptyPage, totalCount: 35 });
    render(<StudentList />);
    await screen.findAllByText(/35명/);
    mockGetStudents.mockResolvedValue(emptyPage);

    fireEvent.change(screen.getByPlaceholderText("이름으로 검색"), { target: { value: "없는이름" } });
    fireEvent.click(screen.getByRole("button", { name: /검색/ }));
    const emptyRow = (await screen.findByText("'없는이름' 검색 결과가 없습니다")).closest("tr")!;

    expect(within(emptyRow).queryByRole("button", { name: "학생 등록" })).not.toBeInTheDocument();
  });
});

// Ruling 815 — 상태 탭 · 반 필터가 서버 쿼리(filter · class_name)로 가고, 지표 칸은 응답의 summary(학원 전체 값)를 그린다.
describe("StudentList — 상태 탭 · 반 필터 · 지표(Ruling 815)", () => {
  afterEach(() => vi.clearAllMocks());

  const item = (studentId: string, className: string) => ({
    studentId,
    name: `학생${studentId}`,
    className,
    guardianPhone: null,
    guardianCount: 0,
    grade: null,
    canGoAlone: false,
    accountLinked: false,
    weeklyAddressStatus: "none" as const,
  });
  const page = {
    summary: { total: 116, classCount: 6, guardianUnlinked: 4, addressMissing: 9, canGoAlone: 31 },
    items: [item("1", "초등 기본반"), item("2", "중등 선행반")],
    page: 0,
    size: 20,
    totalCount: 116,
    hasNext: true,
  };

  it("지표 칸이 summary 의 학원 전체 값을 그린다", async () => {
    mockGetStudents.mockResolvedValue(page);
    render(<StudentList />);

    await screen.findByText("학생1");
    // 지표 칸의 큰 숫자(탭의 건수 알약은 aria-hidden 이라 따로 본다).
    expect(screen.getAllByText("116").length).toBeGreaterThan(0);
    expect(screen.getByText("31")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "보호자 미연결 4건" })).toBeInTheDocument();
  });

  it("보호자 미연결 탭을 누르면 filter=guardian_unlinked 로 0쪽부터 요청한다", async () => {
    mockGetStudents.mockResolvedValue(page);
    render(<StudentList />);
    await screen.findByText("학생1");

    fireEvent.click(screen.getByRole("tab", { name: /보호자 미연결/ }));

    await waitFor(() => expect(mockGetStudents).toHaveBeenLastCalledWith(0, 20, undefined, { className: undefined, filter: "guardian_unlinked" }));
  });

  it("반을 고르면 class_name 으로 요청한다", async () => {
    mockGetStudents.mockResolvedValue(page);
    render(<StudentList />);
    await screen.findByText("학생1");

    fireEvent.change(screen.getByLabelText("반 필터"), { target: { value: "중등 선행반" } });

    await waitFor(() => expect(mockGetStudents).toHaveBeenLastCalledWith(0, 20, undefined, { className: "중등 선행반", filter: undefined }));
  });
});
