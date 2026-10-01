import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { getStudentWeeklyAddresses } from "../api";
import { WeeklyAddressSection } from "./WeeklyAddressSection";

vi.mock("../api", () => ({ getStudentWeeklyAddresses: vi.fn() }));

const mockGet = vi.mocked(getStudentWeeklyAddresses);

// STU-06 — 승하차 주소는 학부모가 요일별로 등록하고 관계자는 조회만 한다. 편집 칸이 아니라 읽기 전용으로 보인다.
describe("WeeklyAddressSection", () => {
  afterEach(() => vi.clearAllMocks());

  it("요일별 등원·하원 주소를 월~일 순서로 읽기 전용으로 보인다", async () => {
    mockGet.mockResolvedValue([
      { weekday: "tue", direction: "from_academy", address: "서울 송파구 1", addressDetail: "101동", verified: true },
      { weekday: "mon", direction: "to_academy", address: "서울 강동구 2", addressDetail: null, verified: true },
    ]);
    render(<WeeklyAddressSection studentId="1" />);

    expect(await screen.findByText("서울 강동구 2")).toBeInTheDocument();
    expect(screen.getByText(/서울 송파구 1/)).toHaveTextContent("서울 송파구 1 (101동)");
    const rows = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(rows[0]).toContain("월"); // 월요일이 화요일보다 앞
    expect(rows[1]).toContain("화");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument(); // 편집 칸 없음
  });

  it("아직 등록하지 않았으면 학부모가 등록한다는 안내를 보인다", async () => {
    mockGet.mockResolvedValue([]);
    render(<WeeklyAddressSection studentId="1" />);

    expect(await screen.findByText(/학부모가 아직 등록하지 않았습니다/)).toBeInTheDocument();
  });

  it("조회에 실패하면 사유를 보이고 폼을 막지 않는다", async () => {
    mockGet.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "서버 오류"));
    render(<WeeklyAddressSection studentId="1" />);

    expect(await screen.findByText("승하차 주소를 불러오지 못했습니다 — 서버 오류")).toBeInTheDocument();
  });
});
