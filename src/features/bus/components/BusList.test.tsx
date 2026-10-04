import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { BusList } from "./BusList";
import { getBuses } from "../api";

vi.mock("../api", () => ({ getBuses: vi.fn() }));
// 등록 창은 저장 완료만 흉내 낸다 — 저장한 차량의 id 를 목록에 넘기는 흐름만 본다.
vi.mock("./BusForm", () => ({
  BusForm: ({ onDone }: { onDone: (savedBusId?: string) => void }) => (
    <div role="dialog" aria-label="차량 등록 창">
      <button type="button" onClick={() => onDone("9")}>
        저장 완료
      </button>
    </div>
  ),
}));

const mockGetBuses = vi.mocked(getBuses);
const emptyPage = { items: [], page: 0, size: 20, totalCount: 0, hasNext: false };
const bus = (id: string, busNo: string, over: Record<string, unknown> = {}) => ({
  id,
  busNo,
  plateNo: `99가${id}`,
  capacity: 20,
  studentCapacity: 18,
  operable: true,
  routeCount: 0,
  scheduleCount: 0,
  todayRuns: [],
  ...over,
});

// R46-FUWEB B1 #11·#12·#19 — 차량 목록: 조회 실패 다시 시도 · 빈 상태 행동 · 저장한 차량 행 강조.
describe("BusList — 다시 시도 · 빈 상태 행동 · 저장 행 강조", () => {
  beforeEach(() => mockGetBuses.mockReset());

  it("조회에 실패하면 다시 시도 버튼이 있고, 누르면 다시 조회해 목록이 나온다", async () => {
    mockGetBuses.mockRejectedValueOnce(new ApiError(503, "UNAVAILABLE", "서버 오류"));
    render(<BusList />);
    await screen.findByText("서버 오류");

    mockGetBuses.mockResolvedValue({ ...emptyPage, items: [bus("1", "1호차")], totalCount: 1 });
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("1호차")).toBeInTheDocument();
  });

  it("차량이 없으면 차량 등록 버튼이 보이고, 저장하면 새로 생긴 그 행이 강조된다", async () => {
    mockGetBuses.mockResolvedValue(emptyPage);
    render(<BusList />);
    const emptyRow = (await screen.findByText("등록된 차량이 없습니다")).closest("tr")!;

    mockGetBuses.mockResolvedValue({ ...emptyPage, items: [bus("8", "8호차"), bus("9", "9호차")], totalCount: 2 });
    fireEvent.click(within(emptyRow).getByRole("button", { name: "차량 등록" }));
    fireEvent.click(await screen.findByRole("button", { name: "저장 완료" }));

    expect((await screen.findByText("9호차")).closest("tr")).toHaveAttribute("data-highlighted", "true");
    expect(screen.getByText("8호차").closest("tr")).not.toHaveAttribute("data-highlighted");
  });
});

// R48-WEB-STAFF — 지표 4칸 · 상태 필터 · 연결 링크 · 기사 미배치(오늘 현황 값을 페이지가 넘겨 준다).
describe("BusList — 지표 · 필터 · 연결", () => {
  beforeEach(() => mockGetBuses.mockReset());
  const run = (runId: string) => ({ runId, direction: "to_academy", departTime: "2026-10-03T11:08:00+09:00", status: "idle" });
  const page = {
    ...emptyPage,
    totalCount: 2,
    items: [bus("1", "1호차", { routeCount: 14, scheduleCount: 14, todayRuns: [run("a"), run("b")] }), bus("4", "4호차", { operable: false, studentCapacity: 10 })],
  };

  it("지표 칸에 서버 값에서 계산한 보유 차량 · 탑승 가능 합계 · 오늘 운행이 나온다", async () => {
    mockGetBuses.mockResolvedValue(page);
    render(<BusList />);
    await screen.findByText("1호차");

    expect(screen.getByText("보유 차량").parentElement).toHaveTextContent("2대");
    expect(screen.getByText("학생 탑승 가능").parentElement).toHaveTextContent("18명");
    // 같은 말이 표 머리글에도 있다 — 지표 칸이 먼저 나온다.
    const todayCell = screen.getAllByText("오늘 운행")[0].parentElement;
    expect(todayCell).toHaveTextContent("2회");
    expect(todayCell).toHaveTextContent("4호차는 쉼");
  });

  it("기사 미배치 회차는 넘겨받은 값 그대로 — 아직 못 받았으면 값을 단정하지 않는다", async () => {
    mockGetBuses.mockResolvedValue(page);
    const { rerender } = render(<BusList unassignedRuns={null} />);
    await screen.findByText("1호차");
    expect(screen.getByText("기사 미배치 회차").parentElement).toHaveTextContent("-");

    rerender(<BusList unassignedRuns={[{ busNo: "3호차", direction: "from_academy", departTime: "2026-10-03T14:53:00+09:00" }]} />);
    expect(screen.getByText("기사 미배치 회차").parentElement).toHaveTextContent("1회");
    expect(screen.getByText("기사 미배치 회차").parentElement).toHaveTextContent("3호차 하원 14:53");
  });

  it("상태 필터를 운행 불가로 바꾸면 그 차량만 남고, 연결이 없는 차량은 연결 없음으로 보인다", async () => {
    mockGetBuses.mockResolvedValue(page);
    render(<BusList />);
    await screen.findByText("1호차");
    expect(screen.getByRole("link", { name: "편성 14" })).toHaveAttribute("href", "/route?bus=1");
    expect(screen.getByRole("link", { name: "스케줄 14" })).toHaveAttribute("href", "/schedule?bus=1");

    fireEvent.click(screen.getByRole("tab", { name: "운행 불가" }));

    expect(screen.queryByText("1호차")).not.toBeInTheDocument();
    expect(screen.getByText("4호차").closest("tr")).toHaveTextContent("연결 없음");
    expect(screen.getByText("4호차").closest("tr")).toHaveTextContent("오늘 운행 없음");
  });
});
