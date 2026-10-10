import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { getRuns } from "@/features/schedule";
import type { RunItemResponseTypes } from "@/features/schedule";
import { addDays, weekdayOfDate } from "../lib/routeAssignments";
import { RouteAssignments } from "./RouteAssignments";

vi.mock("@/features/schedule", () => ({ getRuns: vi.fn() }));
const mockGetRuns = vi.mocked(getRuns);

const today = todayInSeoul();
const tomorrow = addDays(today, 1);
const run = (over: Partial<RunItemResponseTypes>): RunItemResponseTypes => ({
  id: "1",
  busId: "3",
  busNo: "1호차",
  scheduleId: null,
  serviceDate: today,
  direction: "to_academy",
  departTime: `${today}T18:20:00+09:00`,
  confirmAt: `${today}T17:50:00+09:00`,
  status: "idle",
  originName: "",
  destinationName: "",
  estDurationMin: null,
  canceledAt: null,
  consecutiveFailures: 0,
  assignments: [],
  ...over,
});
const routeOf = (serviceDate: string) => ({ busId: "3", weekday: weekdayOfDate(serviceDate), direction: "to_academy" as const });

describe("RouteAssignments — 편성의 오늘·내일 회차 배치(A-08)", () => {
  afterEach(() => vi.clearAllMocks());

  it("오늘 · 내일 회차를 날짜 구분해 따로 읽는다", async () => {
    mockGetRuns.mockResolvedValue({ items: [] });
    render(<RouteAssignments {...routeOf(today)} />);

    await waitFor(() => expect(mockGetRuns).toHaveBeenCalledTimes(2));
    expect(mockGetRuns).toHaveBeenCalledWith(today);
    expect(mockGetRuns).toHaveBeenCalledWith(tomorrow);
  });

  it("같은 편성(차량 · 방향 · 요일)의 회차 배치만 보이고, 다른 차량 · 방향의 배치는 안 보인다", async () => {
    mockGetRuns.mockImplementation(async (date) => ({
      items:
        date === today
          ? [
              run({ id: "mine", assignments: [{ managerId: "1", name: "박기사", role: "driver" }, { managerId: "2", name: "최매니저", role: "escort" }] }),
              run({ id: "other-bus", busId: "4", assignments: [{ managerId: "8", name: "남의기사", role: "driver" }] }),
              run({ id: "other-direction", direction: "from_academy", assignments: [{ managerId: "9", name: "하원기사", role: "driver" }] }),
            ]
          : [],
    }));
    render(<RouteAssignments {...routeOf(today)} />);

    const card = await screen.findByRole("region", { name: "배치 매니저" });
    expect(await within(card).findByText(/박기사/)).toHaveTextContent("기사 박기사 · 동승자 최매니저");
    expect(within(card).queryByText(/남의기사/)).not.toBeInTheDocument();
    expect(within(card).queryByText(/하원기사/)).not.toBeInTheDocument();
  });

  it("배치가 비어 있는 회차는 미배치로 보인다", async () => {
    mockGetRuns.mockImplementation(async (date) => ({ items: date === today ? [run({ assignments: [] })] : [] }));
    render(<RouteAssignments {...routeOf(today)} />);

    expect(await screen.findByText("기사 미배치 · 동승자 미배치")).toBeInTheDocument();
  });

  it("오늘 · 내일 중 같은 편성의 회차가 없으면 없다고 말한다", async () => {
    mockGetRuns.mockResolvedValue({ items: [run({ busId: "4" })] });
    render(<RouteAssignments {...routeOf(today)} />);

    expect(await screen.findByText(/이 편성의 회차가 없습니다/)).toBeInTheDocument();
  });

  it("조회에 실패하면 단정하지 않고 못 불러왔다고 한다", async () => {
    mockGetRuns.mockRejectedValue(new Error("network"));
    render(<RouteAssignments {...routeOf(today)} />);

    expect(await screen.findByText("배치 정보를 불러오지 못했습니다")).toBeInTheDocument();
  });
});
