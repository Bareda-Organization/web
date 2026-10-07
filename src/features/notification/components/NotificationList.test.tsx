import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationList } from "./NotificationList";
import type { NotificationListItemResponseTypes } from "../types";
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

    expect(screen.getByText(/총 0건 · 수신자 미확인 0건/)).toBeInTheDocument();
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

    // 표에는 시:분만(날짜는 날짜 묶음 줄에) — 한국 시간으로 바뀐 값이다.
    expect(await screen.findByText("17:00")).toBeInTheDocument();
    expect(screen.queryByText(/2026-09-12T/)).not.toBeInTheDocument();
  });
});

const row = (id: number) => ({
  notificationId: String(id), sentAt: "2026-09-30T05:00:00Z", busNo: "1호차", recipientName: `수신${id}`, recipientRole: "parent" as string,
  type: "no_show_escalated" as const, body: `내용${id}`, acked: false,
});
const pageOf = (items: NotificationListItemResponseTypes[], page: number, hasNext: boolean) => ({ items, page, size: 20, totalCount: 45, hasNext, unackedCount: 3 });

describe("NotificationList — 필터·쪽·실패 (F03-06·F03-16·F03-17)", () => {
  afterEach(() => vi.clearAllMocks());

  it("2쪽에서 필터를 바꾸면 조회 요청은 한 번, 0쪽으로 나간다", async () => {
    mockGet.mockImplementation(async (page) => pageOf([row(page + 1)], page, page === 0));
    render(<NotificationList />);
    await screen.findByText("내용1");
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("내용2");
    mockGet.mockClear();

    fireEvent.click(screen.getByRole("tab", { name: /수신자 미확인/ }));

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

    expect(await screen.findByText("수신1")).toBeInTheDocument();
    expect(screen.getAllByText(/미승차 무응답/).length).toBeGreaterThan(0);
    // R50 S15 — 미승차 대기 시간은 학원마다 1~30분(A-17)이라 종류 이름에 3분을 박지 않는다.
    expect(screen.queryByText(/3분/)).not.toBeInTheDocument();
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

    const parentRow = (await screen.findByText("김학부모")).closest("tr")!;
    const staffRow = screen.getByText("이관계자").closest("tr")!;
    const adminRow = screen.getByText("박관리자").closest("tr")!;
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


// Ruling 813 — 같은 알림의 수신자를 한 줄로 묶는다(기본 켬). 토글과 "관계자에게 온 알림만" 이 서버 쿼리(group · recipient_role)로 간다.
describe("NotificationList — 묶어 보기 · 관계자 알림만(Ruling 813)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("처음에는 묶어 보기(group=true)로 요청하고, 끄면 group=false 로 다시 요청한다", async () => {
    mockGet.mockResolvedValue(pageOf([row(1)], 0, false));
    render(<NotificationList />);
    await screen.findByText("내용1");
    expect(mockGet).toHaveBeenLastCalledWith(0, 20, expect.objectContaining({ group: true }));

    fireEvent.click(screen.getByRole("checkbox", { name: "같은 알림 묶어 보기" }));

    await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith(0, 20, expect.objectContaining({ group: false })));
  });

  it("관계자에게 온 알림만을 켜면 recipient_role=staff 로 요청한다", async () => {
    mockGet.mockResolvedValue(pageOf([row(1)], 0, false));
    render(<NotificationList />);
    await screen.findByText("내용1");
    expect(mockGet).toHaveBeenLastCalledWith(0, 20, expect.objectContaining({ recipientRole: undefined }));

    fireEvent.click(screen.getByRole("checkbox", { name: "관계자에게 온 알림만" }));

    await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith(0, 20, expect.objectContaining({ recipientRole: "staff" })));
  });

  it("묶음 행은 첫 수신자 외 N명과 확인 수를 보여 준다", async () => {
    // Ruling 850 — 확인 수는 추적하는 종류(no_show)에서만 보인다.
    const grouped: NotificationListItemResponseTypes = {
      ...row(1),
      type: "no_show",
      recipientName: "장주희",
      recipientCount: 4,
      ackedCount: 0,
      recipients: [{ recipientName: "장주희", recipientRole: "parent" }],
    };
    mockGet.mockResolvedValue(pageOf([grouped], 0, false));
    render(<NotificationList />);

    expect(await screen.findByText("외 3명")).toBeInTheDocument();
    expect(screen.getByText("미확인 4/4")).toBeInTheDocument();
  });
});

// Ruling 850 · NTF-10 — 서버가 수신 확인을 추적하는 것은 중요 통지 3종(delay · no_show · route_changed)뿐이고
// 그 밖의 종류는 acked 가 언제나 false 다. 모든 행에 "미확인" 을 그리면 확인할 수 없는 알림이 경고처럼 읽힌다.
describe("NotificationList — 확인 여부는 중요 통지 3종만(Ruling 850)", () => {
  afterEach(() => vi.clearAllMocks());

  it("추적하지 않는 종류(boarding)의 낱개 행은 '확인 대상 아님' 이고 미확인 칩이 없다", async () => {
    mockGet.mockResolvedValue(pageOf([{ ...row(1), type: "boarding", recipientName: "김학부모", recipientRole: "parent" }], 0, false));
    render(<NotificationList />);

    const boardingRow = (await screen.findByText("김학부모")).closest("tr")!;
    expect(within(boardingRow).getByText("확인 대상 아님")).toBeInTheDocument();
    expect(within(boardingRow).queryByText("미확인")).not.toBeInTheDocument();
  });

  it("추적하는 종류(delay)의 미확인 낱개 행은 경고색 '미확인' 칩이다", async () => {
    mockGet.mockResolvedValue(pageOf([{ ...row(1), type: "delay", recipientName: "김학부모", recipientRole: "parent" }], 0, false));
    render(<NotificationList />);

    const delayRow = (await screen.findByText("김학부모")).closest("tr")!;
    expect(within(delayRow).getByText("미확인")).toHaveAttribute("data-tone", "warn");
    expect(within(delayRow).queryByText("확인 대상 아님")).not.toBeInTheDocument();
  });

  it("추적하지 않는 종류의 묶음 행(run_started)은 확인 N/M 없이 '확인 대상 아님' 이다", async () => {
    const grouped: NotificationListItemResponseTypes = {
      ...row(1), type: "run_started", recipientName: "장주희", recipientCount: 4, ackedCount: 0,
      recipients: [{ recipientName: "장주희", recipientRole: "parent" }],
    };
    mockGet.mockResolvedValue(pageOf([grouped], 0, false));
    render(<NotificationList />);

    const groupRow = (await screen.findByText("장주희")).closest("tr")!;
    expect(within(groupRow).getByText("확인 대상 아님")).toBeInTheDocument();
    expect(within(groupRow).queryByText(/확인 \d+\/\d+|미확인/)).not.toBeInTheDocument();
  });

  it("추적하는 종류의 묶음 행(no_show)은 확인 N/M 을 그대로 보여 준다", async () => {
    const grouped: NotificationListItemResponseTypes = {
      ...row(1), type: "no_show", recipientName: "장주희", recipientCount: 20, ackedCount: 14,
      recipients: [{ recipientName: "장주희", recipientRole: "parent" }],
    };
    mockGet.mockResolvedValue(pageOf([grouped], 0, false));
    render(<NotificationList />);

    const groupRow = (await screen.findByText("장주희")).closest("tr")!;
    expect(within(groupRow).getByText("확인 14/20")).toBeInTheDocument();
  });
});
