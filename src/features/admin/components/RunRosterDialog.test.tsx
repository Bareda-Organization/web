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

    // 머리의 × 와 아래 [닫기] 둘 다 닫는다(R48 시안 `monitoring--roster`).
    const closers = screen.getAllByRole("button", { name: "닫기" });
    expect(closers).toHaveLength(2);
    fireEvent.click(closers[1]);

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
    expect(screen.getAllByRole("button", { name: "닫기" }).length).toBeGreaterThan(0);
    expect(scrollArea).toHaveStyle({ overflowY: "auto" });
    // 상한이 없으면 "none" 이라 NaN — 상한이 화면보다 작아야 닫기 버튼이 스크롤 없이 보인다.
    expect(parseFloat(getComputedStyle(scrollArea).maxHeight)).toBeLessThan(window.innerHeight);
  });
});

// R48 시안 `monitoring--roster` — 승하차지별 묶음 · 학생 / 학부모 연락처 · 상태 막대와 건수. 보호자가 없으면 번호 대신 –.
describe("RunRosterDialog — 묶음 · 연락처 · 건수", () => {
  afterEach(() => vi.clearAllMocks());

  it("승하차지별 머리줄, 두 연락처 열, 상태 건수를 보인다", async () => {
    mockGetRunRoster.mockResolvedValue({
      stops: [
        {
          stopId: "1",
          seq: 1,
          name: "극동아파트 정문",
          students: [
            { ...student("1", "원하율"), status: "boarded" as const, studentPhone: "010-0000-3101", guardianPhone: "010-0000-4101" },
            { ...student("2", "한도윤"), status: "absent" as const, studentPhone: null, guardianPhone: "010-0000-4106" },
          ],
        },
        { stopId: "2", seq: 2, name: "삼익아파트 정문", students: [{ ...student("3", "송지아"), status: "no_show" as const, guardianPhone: null }] },
      ],
    });
    render(<RunRosterDialog runId="1" busNo="2호차" direction="등원" onClose={vi.fn()} />);

    expect(await screen.findByText("극동아파트 정문 · 2명")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "2호차 · 등원 탑승 명단" })).toBeInTheDocument();
    expect(screen.getByText("010-0000-3101")).toBeInTheDocument();
    expect(screen.getByText("010-0000-4106")).toBeInTheDocument();
    expect(screen.getByText(/탑승 완료 1 · 미승차 1 · 미등원 1 · 대기 0 · 3명/)).toBeInTheDocument();
    // 미등원은 회색(끝남 모양)이고 미승차는 위험이다(Ruling 811).
    expect(screen.getByText("미등원").closest("[data-tone]")).toHaveAttribute("data-tone", "off");
    expect(screen.getByText("미승차").closest("[data-tone]")).toHaveAttribute("data-tone", "bad");
  });
});
