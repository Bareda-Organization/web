import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentList } from "./StudentList";
import { getStudents } from "../api";

// §5.11 신설 필드 guardian_count — 표의 "보호자 연결" 열이 0 은 "미연결", 1 이상은
// "연결 N명" 으로 보여야 한다. guardian_phone 유무로 추론하지 않는다는 것을 함께 본다
// (미연결 행은 guardianPhone 도 null 이지만, 검사 대상은 guardianCount 문구다).
vi.mock("../api", () => ({
  getStudents: vi.fn(),
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
        },
        {
          studentId: "2",
          name: "다자녀학생",
          className: null,
          guardianPhone: "010-1000-0001",
          guardianCount: 2,
        },
      ],
      page: 0,
      size: 20,
      totalCount: 2,
      hasNext: false,
    });

    render(<StudentList />);

    await waitFor(() => expect(screen.getByText("미연결")).toBeInTheDocument());
    expect(screen.getByText("연결 2명")).toBeInTheDocument();
  });
});

// F02-04 — 검색을 제출했을 때 앞선 요청의 응답이 더 늦게 도착해도 검색 결과가 덮이면 안 된다.
describe("StudentList — F02-04 늦게 온 옛 응답", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const listOf = (name: string) => ({
    items: [{ studentId: "1", name, className: null, guardianPhone: null, guardianCount: 0 }],
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
    await waitFor(() => expect(mockGetStudents).toHaveBeenLastCalledWith(1, 20, undefined));
    mockGetStudents.mockClear();

    fireEvent.change(screen.getByPlaceholderText("이름으로 검색"), { target: { value: "검색" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    await waitFor(() => expect(mockGetStudents).toHaveBeenCalled());
    await act(async () => {});
    expect(mockGetStudents.mock.calls.filter((call) => call[2] === "검색")).toHaveLength(1);
  });
});
