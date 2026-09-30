import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportList } from "./ReportList";
import { getReports } from "../api";
import { getDashboard } from "@/features/run";

// §5.20 EXC-02·03 · API_SPEC §1.9 — 조회 전용 화면이라 두 갈래만 고정한다:
// (1) 빈 목록이면 총 0건을 보여주고 표에 행이 없어야 한다.
// (2) 조회가 실패하면 조용히 넘어가지 않고 오류 문구를 보여줘야 한다.
vi.mock("../api", () => ({
  getReports: vi.fn(),
}));

// 회차 필터 후보(오늘 회차)는 run 기능의 대시보드 조회에서 온다.
vi.mock("@/features/run", () => ({
  getDashboard: vi.fn(),
}));

const mockGet = vi.mocked(getReports);
const mockGetDashboard = vi.mocked(getDashboard);

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

  // R34-W2 — 응답이 오기 전에는 빈 목록 문구가 아니라 불러오는 중 문구가 보여야 한다.
  it("응답이 오기 전에는 빈 목록 문구 대신 불러오는 중 문구를 보여준다", async () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    render(<ReportList />);

    expect(screen.getByText("불러오는 중입니다")).toBeInTheDocument();
    expect(screen.queryByText("표시할 내용이 없습니다")).not.toBeInTheDocument();
  });

  it("조회가 실패하면 화면이 조용히 넘어가지 않고 오류 문구를 보여준다", async () => {
    mockGet.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));

    render(<ReportList />);

    await waitFor(() => expect(screen.getByText("운행 리포트를 불러오지 못했습니다")).toBeInTheDocument());
  });
});

// R32-W9 — 신고 시각이 서버의 ISO 원문으로 보였다.
describe("ReportList — 시각 표기(R32-W9)", () => {
  afterEach(() => vi.clearAllMocks());

  it("신고 시각을 ISO 원문이 아니라 한국 시간으로 보여준다", async () => {
    mockGet.mockResolvedValue({
      items: [{ reportId: "1", type: "absence", busNo: "1호차", studentName: "박학생", reportedBy: "김학부모", reportedAt: "2026-09-12T08:00:00Z" }],
    } as never);
    render(<ReportList />);

    expect(await screen.findByText("2026-09-12 17:00")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-12T/)).not.toBeInTheDocument();
  });
});

// F01-05·F01-14 — 종류·날짜·회차 필터가 조회 하나로 모이고, 앞선 요청의 늦은 응답은 버려진다.
describe("ReportList — 필터·경합(F01-05·F01-14)", () => {
  const REPORT = (reportId: string, memo: string) =>
    ({ reportId, type: "etc", busNo: "1호차", studentName: null, reportedBy: "김기사", reportedAt: "2026-09-12T08:00:00Z", memo, handled: false }) as never;

  beforeEach(() => {
    mockGetDashboard.mockResolvedValue({ metrics: {}, runs: [{ runId: "7", busNo: "2호차", direction: "to_academy" }] } as never);
  });
  afterEach(() => vi.clearAllMocks());

  it("회차를 고르면 그 run_id 로 조회한다", async () => {
    mockGet.mockResolvedValue({ items: [] });
    render(<ReportList />);
    await screen.findByRole("option", { name: "2호차 · 등원" });

    fireEvent.change(screen.getByLabelText("회차"), { target: { value: "7" } });

    await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith(expect.objectContaining({ runId: "7" })));
  });

  it("날짜를 바꾸면 조회는 새 날짜로 한 번 나간다", async () => {
    mockGet.mockResolvedValue({ items: [] });
    render(<ReportList />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-09-12" } });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(mockGet).toHaveBeenLastCalledWith(expect.objectContaining({ date: "2026-09-12" }));
  });

  it("조건을 바꾸기 전에 보낸 요청의 늦은 응답이 새 조건의 목록을 덮지 않는다", async () => {
    let resolveFirst: (value: { items: never[] }) => void = () => {};
    mockGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    mockGet.mockResolvedValue({ items: [REPORT("2", "새 조건의 보고")] });
    render(<ReportList />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("종류"), { target: { value: "etc" } });
    await screen.findByText("새 조건의 보고");
    resolveFirst({ items: [REPORT("1", "옛 조건의 보고")] });

    await waitFor(() => expect(screen.queryByText("옛 조건의 보고")).not.toBeInTheDocument());
    expect(screen.getByText("새 조건의 보고")).toBeInTheDocument();
  });
});
