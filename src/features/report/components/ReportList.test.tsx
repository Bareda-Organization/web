import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportList } from "./ReportList";
import { getReports, handleReport } from "../api";
import { getRuns } from "@/features/schedule";

// §5.20 EXC-02·03 · API_SPEC §1.9 — 조회 전용 화면이라 두 갈래만 고정한다:
// (1) 빈 목록이면 총 0건을 보여주고 표에 행이 없어야 한다.
// (2) 조회가 실패하면 조용히 넘어가지 않고 오류 문구를 보여줘야 한다.
vi.mock("../api", () => ({
  getReports: vi.fn(),
  handleReport: vi.fn(),
}));

// 회차 필터 후보는 schedule 기능의 날짜별 회차 조회(GET /staff/runs?service_date=)에서 온다.
vi.mock("@/features/schedule", () => ({
  getRuns: vi.fn(),
}));

const mockGet = vi.mocked(getReports);
const mockGetRuns = vi.mocked(getRuns);
const mockHandle = vi.mocked(handleReport);

describe("ReportList — 조회 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("빈 목록이면 총 0건을 보여주고 표에 행이 없다", async () => {
    mockGet.mockResolvedValue({ items: [], counts: null });

    const { container } = render(<ReportList />);

    // items.length 로 "총 N건" 을 계산하는데 초기 items 도 [] 라 fetch 전
    // 렌더에서 이미 "총 0건" 이 떠 있다 — NotificationList 와 같은 함정이라
    // loading 이 false 로 바뀐 뒤(Card 의 aria-busy)에만 판정한다.
    await waitFor(() => expect(container.querySelector('[aria-busy="false"]')).toBeTruthy());

    expect(screen.getByText(/총 0건/)).toBeInTheDocument();
    // 데이터 행은 없고, 머리글 아래에 빈 목록 문구(R32-W10)가 한 줄 있다.
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("조건에 맞는 신고가 없습니다")).toBeInTheDocument();
  });

  // R34-W2 — 응답이 오기 전에는 빈 목록 문구가 아니라 불러오는 중 문구가 보여야 한다.
  it("응답이 오기 전에는 빈 목록 문구 대신 불러오는 중 문구를 보여준다", async () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    render(<ReportList />);

    expect(screen.getByText("불러오는 중입니다")).toBeInTheDocument();
    expect(screen.queryByText("조건에 맞는 신고가 없습니다")).not.toBeInTheDocument();
  });

  // Z-04(Ruling 379 ①) — 서버는 최근 200건까지만 준다. 200건이 오면 "전체" 로 읽히지 않게 상한을 알린다.
  it("200건이 오면 최근 200건까지만 표시한다고 알리고, 그보다 적으면 알리지 않는다", async () => {
    const row = { reportId: "1", type: "etc" as const, memo: "m", runId: "1", busNo: "1호차", studentName: null, reportedBy: "이기사", reportedAt: "2026-09-30T08:00:00", handled: false, handledAt: null, reportedByRole: null, handledByName: null };
    mockGet.mockResolvedValue({ items: Array.from({ length: 200 }, (_, i) => ({ ...row, reportId: String(i) })), counts: null });
    const { unmount } = render(<ReportList />);
    expect(await screen.findByText(/최근 200건까지만 표시합니다/)).toBeInTheDocument();
    unmount();

    mockGet.mockResolvedValue({ items: [row], counts: null });
    render(<ReportList />);
    await screen.findByText(/총 1건/);
    expect(screen.queryByText(/최근 200건까지만/)).not.toBeInTheDocument();
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
    mockGetRuns.mockResolvedValue({ items: [{ id: "7", busNo: "2호차", direction: "to_academy", departTime: "08:10" }] } as never);
  });
  afterEach(() => vi.clearAllMocks());

  it("회차를 고르면 그 run_id 로 조회한다", async () => {
    mockGet.mockResolvedValue({ items: [], counts: null });
    render(<ReportList />);
    await screen.findByRole("option", { name: "08:10 2호차 · 등원" });

    fireEvent.change(screen.getByLabelText("회차"), { target: { value: "7" } });

    await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith(expect.objectContaining({ runId: "7" })));
  });

  it("날짜를 바꾸면 조회는 새 날짜로 한 번 나간다", async () => {
    mockGet.mockResolvedValue({ items: [], counts: null });
    render(<ReportList />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-09-12" } });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(mockGet).toHaveBeenLastCalledWith(expect.objectContaining({ date: "2026-09-12" }));
  });

  // R50 S16 — 회차 후보가 늘 오늘 회차였다. 고른 날짜의 회차(GET /staff/runs?service_date=)를 후보로 쓴다.
  it("날짜를 고르면 회차 후보를 그 날짜의 회차로 다시 읽고, 앞서 고른 회차는 비운다", async () => {
    mockGet.mockResolvedValue({ items: [], counts: null });
    mockGetRuns.mockImplementation(async (serviceDate?: string) =>
      ({ items: [{ id: serviceDate ? "9" : "7", busNo: serviceDate ? "5호차" : "2호차", direction: "to_academy", departTime: "08:10" }] }) as never,
    );
    render(<ReportList />);
    await screen.findByRole("option", { name: "08:10 2호차 · 등원" });
    expect(mockGetRuns).toHaveBeenLastCalledWith(undefined);
    fireEvent.change(screen.getByLabelText("회차"), { target: { value: "7" } });

    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-09-12" } });

    expect(await screen.findByRole("option", { name: "08:10 5호차 · 등원" })).toBeInTheDocument();
    expect(mockGetRuns).toHaveBeenLastCalledWith("2026-09-12");
    expect(screen.queryByRole("option", { name: "08:10 2호차 · 등원" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("회차")).toHaveValue("");
  });

  it("조건을 바꾸기 전에 보낸 요청의 늦은 응답이 새 조건의 목록을 덮지 않는다", async () => {
    let resolveFirst: (value: { items: never[]; counts: null }) => void = () => {};
    mockGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    mockGet.mockResolvedValue({ items: [REPORT("2", "새 조건의 보고")], counts: null });
    render(<ReportList />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("tab", { name: /^기타/ }));
    await screen.findByText("새 조건의 보고");
    resolveFirst({ items: [REPORT("1", "옛 조건의 보고")], counts: null });

    await waitFor(() => expect(screen.queryByText("옛 조건의 보고")).not.toBeInTheDocument());
    expect(screen.getByText("새 조건의 보고")).toBeInTheDocument();
  });
});

// R46-FUWEB B1 #11 — 목록을 못 읽으면 새로고침 말고는 되돌릴 길이 없었다. 조회 조건은 그대로 두고 같은 조회를 다시 낸다.
describe("ReportList — 다시 시도", () => {
  afterEach(() => vi.clearAllMocks());

  it("조회에 실패하면 다시 시도 버튼이 있고, 누르면 같은 조건으로 다시 조회해 목록이 나온다", async () => {
    mockGetRuns.mockResolvedValue({ items: [] } as never);
    mockGet.mockRejectedValueOnce(new Error("네트워크 요청이 실패했습니다"));
    render(<ReportList />);
    await screen.findByText("운행 리포트를 불러오지 못했습니다");

    mockGet.mockResolvedValue({
      items: [{ reportId: "1", reportedAt: "2026-09-12T08:00:00", type: "no_show", busNo: "1호차", studentName: "김철수", reportedBy: "이기사", memo: "복구됨", handled: false }],
    } as never);
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("복구됨")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});


// Ruling 814 — 처리 표시. 옆 패널의 [처리 완료로 표시] 가 POST /staff/reports/{id}/handle 을 부르고 그 행이 처리됨으로 바뀐다.
describe("ReportList — 처리 완료로 표시(Ruling 814)", () => {
  afterEach(() => vi.clearAllMocks());

  const unhandled = {
    reportId: "9",
    type: "guardian_absent" as const,
    memo: "하원 시 보호자 부재",
    runId: "7",
    busNo: "1호차",
    studentName: "원하율",
    reportedBy: "정은영",
    reportedByRole: "escort" as const,
    reportedAt: "2026-10-01T09:40:00Z",
    handled: false,
    handledAt: null,
    handledByName: null,
  };

  it("행을 눌러 연 옆 패널에서 [처리 완료로 표시] 를 누르면 그 보고 id 로 handle 을 부르고 처리됨으로 보인다", async () => {
    mockGetRuns.mockResolvedValue({ items: [] } as never);
    mockGet.mockResolvedValue({ items: [unhandled], counts: { handled: 0, unhandled: 1 } });
    mockHandle.mockResolvedValue({ ...unhandled, handled: true, handledAt: "2026-10-03T03:35:00Z", handledByName: "박지현" });
    render(<ReportList />);

    fireEvent.click(await screen.findByText("원하율"));
    const panel = await screen.findByRole("dialog");
    fireEvent.click(within(panel).getByRole("button", { name: "처리 완료로 표시" }));

    await waitFor(() => expect(mockHandle).toHaveBeenCalledWith("9"));
    expect(await within(panel).findByText(/처리됨 · 박지현/)).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "처리 완료로 표시" })).not.toBeInTheDocument();
  });

  it("이미 처리된 보고에는 [처리 완료로 표시] 가 없다", async () => {
    mockGetRuns.mockResolvedValue({ items: [] } as never);
    mockGet.mockResolvedValue({ items: [{ ...unhandled, handled: true, handledByName: "박지현" }], counts: { handled: 1, unhandled: 0 } });
    render(<ReportList />);

    fireEvent.click(await screen.findByText("원하율"));

    const panel = await screen.findByRole("dialog");
    expect(within(panel).queryByRole("button", { name: "처리 완료로 표시" })).not.toBeInTheDocument();
  });

  it("처리 필터를 미처리로 바꾸면 handled=false 로 요청한다", async () => {
    mockGetRuns.mockResolvedValue({ items: [] } as never);
    mockGet.mockResolvedValue({ items: [unhandled], counts: { handled: 2, unhandled: 3 } });
    render(<ReportList />);
    await screen.findByText("원하율");

    fireEvent.click(screen.getByRole("tab", { name: /미처리 3/ }));

    await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith(expect.objectContaining({ handled: false })));
  });
});
