import { render, screen, waitFor } from "@testing-library/react";
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
          busNo: null,
          stopName: null,
          guardianPhone: null,
          guardianCount: 0,
        },
        {
          studentId: "2",
          name: "다자녀학생",
          className: null,
          busNo: null,
          stopName: null,
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
