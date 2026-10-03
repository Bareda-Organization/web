import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunRosterDialog } from "./RunRosterDialog";
import { getRunRoster } from "../api";
import { ApiError } from "@/shared/lib/http";

vi.mock("../api", () => ({
  getRunRoster: vi.fn(),
}));

const mockGetRunRoster = vi.mocked(getRunRoster);

const student = (studentId: string, name: string) => ({
  studentId,
  name,
  photoUrl: null,
  studentPhone: null,
  guardianPhone: null,
  status: "waiting" as const,
});

// 전체 관제 [명단 보기] — 닫기 버튼이 없어 Esc 밖에 닫을 방법이 없었고, 명단이 길면(실측 1,422px · 화면 720px) 대화상자가
// 화면보다 길어져 닫기 버튼이 스크롤 아래로 밀렸다. 명단은 높이가 제한된 영역 안에서 스크롤하고 닫기는 그 밖(footer)에 둔다.
describe("RunRosterDialog — 닫기와 긴 명단", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("닫기 버튼을 누르면 onClose 를 부른다 — 명단 조회가 실패해도 닫을 수 있다", async () => {
    mockGetRunRoster.mockRejectedValue(new ApiError(500, "UNKNOWN", "명단 조회 중 오류가 발생했습니다"));
    const onClose = vi.fn();
    render(<RunRosterDialog runId="1" busNo="1호차" onClose={onClose} />);
    await waitFor(() => expect(screen.getByText("명단 조회 중 오류가 발생했습니다")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("명단은 높이가 제한된 스크롤 영역 안에 있고, 닫기 버튼은 그 영역 밖에 있다", async () => {
    mockGetRunRoster.mockResolvedValue({
      stops: [{ stopId: "1", seq: 1, name: "강남역", students: Array.from({ length: 40 }, (_, i) => student(String(i), `학생${i}`)) }],
    });
    render(<RunRosterDialog runId="1" busNo="1호차" onClose={vi.fn()} />);

    const scrollArea = await screen.findByRole("region", { name: "탑승 명단" });

    expect(within(scrollArea).getByText("학생39")).toBeInTheDocument();
    expect(within(scrollArea).queryByRole("button", { name: "닫기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
    expect(scrollArea).toHaveStyle({ overflowY: "auto" });
    expect(getComputedStyle(scrollArea).maxHeight).not.toBe("");
  });
});
