import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getManagers } from "../api";
import { ManagerList } from "./ManagerList";

vi.mock("../api", () => ({ getManagers: vi.fn() }));
vi.mock("@/features/auth", () => ({ AccountPasswordResetDialog: ({ name, roleLabel }: { name: string; roleLabel?: string }) => <div>초기화 확인: {name} {roleLabel}</div> }));

const mockGetManagers = vi.mocked(getManagers);
const TODAY_RUN = { runId: "1", serviceDate: "2099-01-01", busNo: "3호차", direction: "to_academy" as const, departTime: "2099-01-01T11:00:00+09:00", status: "idle" as const };
const manager = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  phone: `010-0000-${id.padStart(4, "0")}`,
  role: "driver" as const,
  workHours: null,
  accountId: "101",
  assignedRunCount: 0,
  assignments: [],
  ...over,
});
const page = (items: ReturnType<typeof manager>[]) => ({ items, counts: null, page: 0, size: 20, totalCount: items.length, hasNext: false });

// B1 #8 — 매니저를 등록해도 앱에서 가입 승인을 받기 전에는 앱에 들어올 수 없다. 목록이 그 상태를 말해 줘야 한다.
describe("ManagerList — 앱 계정 연결 상태", () => {
  afterEach(() => vi.clearAllMocks());

  it("계정이 연결된 매니저는 '연결됨', 아닌 매니저는 '앱 가입 전' 으로 보인다", async () => {
    mockGetManagers.mockResolvedValue(page([manager("1", "김기사"), manager("2", "이동승", { role: "escort", accountId: null })]));
    render(<ManagerList />);

    const linkedRow = (await screen.findByText("김기사")).closest("tr")!;
    const unlinkedRow = screen.getByText("이동승").closest("tr")!;
    expect(within(linkedRow).getByText("연결됨")).toBeInTheDocument();
    expect(within(unlinkedRow).getByText("앱 가입 전")).toBeInTheDocument();
  });
});

// R48 — 역할 탭 · 오늘 배치 필터는 서버 쿼리(§5.13 Ruling 817)로 간다. 화면이 받은 쪽을 가려내지 않는다.
describe("ManagerList — 탭 · 필터 쿼리", () => {
  beforeEach(() => mockGetManagers.mockResolvedValue(page([manager("1", "김기사")])));
  afterEach(() => vi.clearAllMocks());

  it("기사 탭 · 배치 없음 필터를 누르면 role · assigned_today 를 실어 0쪽부터 다시 읽는다", async () => {
    render(<ManagerList />);
    await screen.findByText("김기사");

    fireEvent.click(screen.getByRole("tab", { name: /^기사/ }));
    await waitFor(() => expect(mockGetManagers).toHaveBeenLastCalledWith(0, 20, undefined, { role: "driver", assignedToday: undefined }));

    fireEvent.click(screen.getByRole("tab", { name: "배치 없음" }));
    await waitFor(() => expect(mockGetManagers).toHaveBeenLastCalledWith(0, 20, undefined, { role: "driver", assignedToday: false }));
  });
});

// R48 — 기사 미배치 회차 띠: 페이지가 넘긴 회차에, 오늘 배치가 없고 그 시각이 근무 시간 안인 기사를 이름으로 짚는다.
describe("ManagerList — 기사 미배치 띠 · 오늘 배치 열", () => {
  afterEach(() => vi.clearAllMocks());
  const wholeWeek = { sun: [{ start: "09:00", end: "23:00" }], mon: [{ start: "09:00", end: "23:00" }], tue: [{ start: "09:00", end: "23:00" }], wed: [{ start: "09:00", end: "23:00" }], thu: [{ start: "09:00", end: "23:00" }], fri: [{ start: "09:00", end: "23:00" }], sat: [{ start: "09:00", end: "23:00" }] };

  it("배치 없는 기사는 띠에 이름이 나오고 행은 '배치 없음', 배치된 기사는 오늘 호차가 나온다", async () => {
    mockGetManagers.mockResolvedValue(
      page([manager("1", "배치기사", { workHours: wholeWeek, assignments: [{ ...TODAY_RUN, serviceDate: new Date().toISOString().slice(0, 10) }] }), manager("2", "문태호", { workHours: wholeWeek })]),
    );
    render(<ManagerList unassignedRuns={[{ busNo: "3호차", direction: "from_academy", departTime: "2026-10-03T14:53:00+09:00" }]} />);

    expect(await screen.findByText("3호차 하원(14:53)에 기사가 배치되지 않았습니다")).toBeInTheDocument();
    const alert = screen.getByText("3호차 하원(14:53)에 기사가 배치되지 않았습니다").closest<HTMLElement>("[role=status]")!;
    expect(within(alert).getByText("문태호")).toBeInTheDocument();
    expect(within(alert).queryByText("배치기사")).not.toBeInTheDocument();
    // 같은 이름이 띠와 표에 모두 있다 — 표 안에서 짚는다.
    expect(within(within(screen.getByRole("table")).getByText("문태호").closest("tr")!).getByText("배치 없음")).toBeInTheDocument();
  });

  it("행의 상세 단추를 누르면 그 매니저의 옆 패널이 열린다", async () => {
    mockGetManagers.mockResolvedValue(page([manager("1", "김기사", { assignedRunCount: 2 })]));
    render(<ManagerList />);

    fireEvent.click(await screen.findByRole("button", { name: "김기사 상세" }));

    const panel = await screen.findByRole("dialog");
    expect(within(panel).getByText("배치 2회를 먼저 해제해야 삭제할 수 있습니다")).toBeInTheDocument();
  });

  it("비밀번호 초기화 단추는 계정이 연결된 매니저에게만 있고, 역할을 붙여 확인 창을 연다", async () => {
    mockGetManagers.mockResolvedValue(page([manager("1", "김기사"), manager("2", "이동승", { role: "escort", accountId: null })]));
    render(<ManagerList />);
    await screen.findByText("김기사");

    expect(screen.queryByRole("button", { name: "이동승 비밀번호 초기화" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "김기사 비밀번호 초기화" }));
    expect(screen.getByText("초기화 확인: 김기사 기사")).toBeInTheDocument();
  });
});
