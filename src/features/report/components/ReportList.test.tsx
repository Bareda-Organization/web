import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportList } from "./ReportList";
import { getReports } from "../api";

// §5.20 EXC-02·03 · API_SPEC §1.9 — 조회 전용 화면이라 두 갈래만 고정한다:
// (1) 빈 목록이면 총 0건을 보여주고 표에 행이 없어야 한다.
// (2) 조회가 실패하면 조용히 넘어가지 않고 오류 문구를 보여줘야 한다.
vi.mock("../api", () => ({
  getReports: vi.fn(),
}));

const mockGet = vi.mocked(getReports);

describe("ReportList — 조회 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("빈 목록이면 총 0건을 보여주고 표에 행이 없다", async () => {
    mockGet.mockResolvedValue({ items: [] });

    const { container } = render(<ReportList />);

    // items.length 로 "총 N건" 을 계산하는데 초기 items 도 [] 라 fetch 전
    // 렌더에서 이미 "총 0건" 이 떠 있다 — NotificationList 와 같은 함정이라
    // loading 이 false 로 바뀐 뒤(Card 의 aria-busy)에만 판정한다.
    await waitFor(() => expect(container.querySelector('[aria-busy="false"]')).toBeTruthy());

    expect(screen.getByText("총 0건")).toBeInTheDocument();
    // 데이터 행은 없고, 머리글 아래에 빈 목록 문구(R32-W10)가 한 줄 있다.
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("표시할 내용이 없습니다")).toBeInTheDocument();
  });

  it("조회가 실패하면 화면이 조용히 넘어가지 않고 오류 문구를 보여준다", async () => {
    mockGet.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));

    render(<ReportList />);

    await waitFor(() => expect(screen.getByText("운행 리포트를 불러오지 못했습니다")).toBeInTheDocument());
  });
});
