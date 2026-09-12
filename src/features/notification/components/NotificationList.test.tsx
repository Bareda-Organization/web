import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationList } from "./NotificationList";
import { getNotifications } from "../api";

// §5.17 NTF-10·11 · API_SPEC §1.9 — 조회 전용 화면이라 두 갈래만 고정한다:
// (1) 빈 목록이면 총 건수를 0으로 정확히 보여주고 표에 행이 없어야 한다.
// (2) 조회가 실패하면 조용히 넘어가지 않고 오류 문구를 보여줘야 한다.
vi.mock("../api", () => ({
  getNotifications: vi.fn(),
}));

const mockGet = vi.mocked(getNotifications);

describe("NotificationList — 조회 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("빈 목록이면 총 0건을 보여주고 표에 행이 없다", async () => {
    mockGet.mockResolvedValue({ items: [], page: 0, size: 20, totalCount: 0, hasNext: false, unackedCount: 0 });

    const { container } = render(<NotificationList />);

    // totalCount·unackedCount 는 fetch 전에도 useState(0) 이라 "총 0건" 문구가
    // 초기 렌더에도 이미 떠 있다 — waitFor 가 fetch 완료 전에 조기 통과하는 것을
    // 막으려면, fetch 의 finally 이후에만 false 로 바뀌는 loading 상태(Card 의
    // aria-busy)를 먼저 기다린다.
    await waitFor(() => expect(container.querySelector('[aria-busy="false"]')).toBeTruthy());

    expect(screen.getByText("총 0건 · 미확인 0건")).toBeInTheDocument();
    // 헤더 행 하나만 있고 데이터 행은 없어야 한다.
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });

  it("조회가 실패하면 화면이 조용히 넘어가지 않고 오류 문구를 보여준다", async () => {
    mockGet.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));

    render(<NotificationList />);

    await waitFor(() => expect(screen.getByText("알림 로그를 불러오지 못했습니다")).toBeInTheDocument());
  });
});
