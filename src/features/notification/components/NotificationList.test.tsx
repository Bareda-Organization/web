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
    // 데이터 행은 없고, 머리글 아래에 빈 목록 문구(R32-W10)가 한 줄 있다.
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("표시할 내용이 없습니다")).toBeInTheDocument();
  });

  it("조회가 실패하면 화면이 조용히 넘어가지 않고 오류 문구를 보여준다", async () => {
    mockGet.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));

    render(<NotificationList />);

    await waitFor(() => expect(screen.getByText("알림 로그를 불러오지 못했습니다")).toBeInTheDocument());
  });
});

// R32-W9 — 발송 시각이 서버의 ISO 원문으로 보였다.
describe("NotificationList — 시각 표기(R32-W9)", () => {
  afterEach(() => vi.clearAllMocks());

  it("발송 시각을 ISO 원문이 아니라 한국 시간으로 보여준다", async () => {
    mockGet.mockResolvedValue({
      items: [{ notificationId: "1", type: "delay", busNo: "1호차", recipient: { name: "김학부모", role: "parent" }, sentAt: "2026-09-12T08:00:00Z", read: false }],
      page: 0, size: 20, totalCount: 1, hasNext: false, unackedCount: 1,
    } as never);
    render(<NotificationList />);

    expect(await screen.findByText("2026-09-12 17:00")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-12T/)).not.toBeInTheDocument();
  });
});
