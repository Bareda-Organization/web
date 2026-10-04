import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBuses } from "@/features/bus";
import { getRuns, getSchedules } from "../api";
import type { ScheduleItemResponseTypes } from "../types";
import { ScheduleList } from "./ScheduleList";

vi.mock("../api", () => ({ getSchedules: vi.fn(), getRuns: vi.fn() }));
vi.mock("@/features/bus", () => ({ getBuses: vi.fn() }));
vi.mock("./ScheduleForm", () => ({ ScheduleForm: ({ schedule }: { schedule?: { id: string } }) => <div role="dialog">수정 창 {schedule?.id}</div> }));

const s = (id: string, weekday: ScheduleItemResponseTypes["weekday"], over: Partial<ScheduleItemResponseTypes> = {}): ScheduleItemResponseTypes => ({
  id, busId: "3", busNo: "3호차", weekday, direction: "from_academy", departTime: "17:30", originName: "학원", destinationName: "중동 마을", estDurationMin: 30, active: true, routeStopCount: 10, ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBuses).mockResolvedValue({ items: [{ id: "3", busNo: "3호차", plateNo: "78바2013", capacity: 25, studentCapacity: 23, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] }], page: 0, size: 100, totalCount: 1, hasNext: false });
  vi.mocked(getRuns).mockResolvedValue({ items: [] });
  vi.mocked(getSchedules).mockResolvedValue({ items: [s("1", "mon"), s("2", "sun", { routeStopCount: 0 }), s("3", "wed", { active: false })], page: 0, size: 500, totalCount: 3, hasNext: false });
});

// R48 요일표 — 전량(size=500)을 읽어 칸에 출발 시각 · 예상 소요를 그리고, 비활성 · 노선이 빈 스케줄은 칸에서 따로 말한다.
describe("ScheduleList — 요일표", () => {
  it("칸마다 출발 시각과 상태를 보이고, 칸을 누르면 그 스케줄의 수정 창이 열린다", async () => {
    render(<ScheduleList />);

    const cell = await screen.findByRole("button", { name: "3호차 월요일 하원 17:30 스케줄" });
    expect(cell).toHaveTextContent("30분");
    expect(screen.getByRole("button", { name: "3호차 일요일 하원 17:30 스케줄 · 노선 정차지 0곳" })).toHaveTextContent("정차지 0곳");
    expect(screen.getByRole("button", { name: "3호차 수요일 하원 17:30 스케줄 · 비활성" })).toHaveTextContent("비활성");
    expect(getSchedules).toHaveBeenCalledWith(0, 500);

    fireEvent.click(cell);
    expect(screen.getByRole("dialog")).toHaveTextContent("수정 창 1");
  });

  it("지표의 '노선이 비어 있는 스케줄' 은 활성이면서 편성 정차지가 0곳인 것만 센다", async () => {
    render(<ScheduleList />);
    await screen.findByRole("button", { name: "3호차 월요일 하원 17:30 스케줄" });

    expect(screen.getByText("노선이 비어 있는 스케줄").parentElement).toHaveTextContent("1건");
    expect(screen.getByText("비활성", { selector: "div" }).parentElement).toHaveTextContent("1건");
  });
});
