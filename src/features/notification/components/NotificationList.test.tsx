import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

    expect(screen.getByText("총 0건 · 수신자 미확인 0건")).toBeInTheDocument();
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

const row = (id: number) => ({
  notificationId: String(id), sentAt: "2026-09-30T05:00:00Z", busNo: "1호차", recipientName: `수신${id}`, recipientRole: "parent" as string,
  type: "no_show_escalated" as const, body: `내용${id}`, acked: false,
});
const pageOf = (items: ReturnType<typeof row>[], page: number, hasNext: boolean) => ({ items, page, size: 20, totalCount: 45, hasNext, unackedCount: 3 });

describe("NotificationList — 필터·쪽·실패 (F03-06·F03-16·F03-17)", () => {
  afterEach(() => vi.clearAllMocks());

  it("2쪽에서 필터를 바꾸면 조회 요청은 한 번, 0쪽으로 나간다", async () => {
    mockGet.mockImplementation(async (page) => pageOf([row(page + 1)], page, page === 0));
    render(<NotificationList />);
    await screen.findByText("내용1");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("내용2");
    mockGet.mockClear();

    fireEvent.change(screen.getByLabelText("수신자 확인 여부"), { target: { value: "false" } });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(mockGet).toHaveBeenCalledWith(0, 20, expect.objectContaining({ acked: false }));
  });

  it("쪽 조회가 실패해도 보이던 목록을 지우지 않고 오류만 알린다", async () => {
    mockGet.mockResolvedValueOnce(pageOf([row(1)], 0, true)).mockRejectedValueOnce(new Error("네트워크"));
    render(<NotificationList />);
    await screen.findByText("내용1");

    fireEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(await screen.findByText("알림 로그를 불러오지 못했습니다")).toBeInTheDocument();
    expect(screen.getByText("내용1")).toBeInTheDocument();
  });

  it("수신자 역할과 알림 종류를 영문 원문이 아니라 한글로 보여준다", async () => {
    mockGet.mockResolvedValue(pageOf([row(1)], 0, false));
    render(<NotificationList />);

    expect(await screen.findByText("수신1 (학부모)")).toBeInTheDocument();
    expect(screen.getAllByText(/미승차 무응답/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/escalation/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\(parent\)/)).not.toBeInTheDocument();
  });
});

// R46-FUWEB B1 #20 — "수신자 확인" 의 수신자가 학부모·동승자면 학원이 볼 일이 아니다. 관계자 본인에게 간 알림만
// 학원 관계자가 직접 확인해야 하므로 수신자가 관계자인 행에는 "관계자 알림" 표시를 달아 구분한다.
describe("NotificationList — 관계자 알림 구분", () => {
  afterEach(() => vi.clearAllMocks());

  it("수신자가 학원 관계자·메인 관리자인 행에만 관계자 알림 표시가 붙는다", async () => {
    mockGet.mockResolvedValue(
      pageOf(
        [
          { ...row(1), recipientName: "김학부모", recipientRole: "parent" },
          { ...row(2), recipientName: "이관계자", recipientRole: "staff" },
          { ...row(3), recipientName: "박관리자", recipientRole: "system_admin" },
        ],
        0,
        false,
      ),
    );
    render(<NotificationList />);

    const parentRow = (await screen.findByText("김학부모 (학부모)")).closest("tr")!;
    const staffRow = screen.getByText("이관계자 (학원 관계자)").closest("tr")!;
    const adminRow = screen.getByText("박관리자 (메인 관리자)").closest("tr")!;
    expect(within(parentRow).queryByText("관계자 알림")).not.toBeInTheDocument();
    expect(within(staffRow).getByText("관계자 알림")).toBeInTheDocument();
    expect(within(adminRow).getByText("관계자 알림")).toBeInTheDocument();
  });
});

// R46-FUWEB B1 #11 — 쪽 조회 훅(usePagedList)을 쓰는 목록도 [다시 시도] 로 같은 쪽을 다시 읽는다.
describe("NotificationList — 다시 시도", () => {
  afterEach(() => vi.clearAllMocks());

  it("조회에 실패하면 다시 시도 버튼이 있고, 누르면 다시 조회해 목록이 나온다", async () => {
    mockGet.mockRejectedValueOnce(new Error("네트워크 요청이 실패했습니다"));
    render(<NotificationList />);
    await screen.findByText("알림 로그를 불러오지 못했습니다");

    mockGet.mockResolvedValue(pageOf([row(1)], 0, false));
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("내용1")).toBeInTheDocument();
  });
});

