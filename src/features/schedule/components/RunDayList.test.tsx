import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RunDayList } from "./RunDayList";
import { getRuns } from "../api";
import type { RunItemResponseTypes } from "../types";

// W4 — 확정이 계속 실패하는 회차를 이 목록에서 바로 알아볼 수 있어야 한다
// (`API_SPEC §5.10` `consecutive_failures`). 0 이면 문구를 보여줄 이유가 없다.
vi.mock("../api", () => ({
  getRuns: vi.fn(),
  cancelRun: vi.fn(),
}));

const mockGetRuns = vi.mocked(getRuns);

const baseRun: RunItemResponseTypes = {
  id: "1",
  busId: "3",
  busNo: "1호차",
  scheduleId: "1",
  serviceDate: "2026-09-15",
  direction: "to_academy",
  departTime: "2026-09-15T08:00:00",
  confirmAt: "2026-09-15T07:30:00",
  status: "idle",
  originName: "정문",
  destinationName: "학원",
  estDurationMin: 20,
  canceledAt: null,
  consecutiveFailures: 0,
  assignments: [],
};

describe("RunDayList — W4 연속 실패 표시", () => {
  it("consecutiveFailures 가 0 보다 크면 확정 N회 연속 실패 문구를 보여준다", async () => {
    mockGetRuns.mockResolvedValue({ items: [{ ...baseRun, consecutiveFailures: 3 }] });
    render(<RunDayList />);

    expect(await screen.findByText("확정 3회 연속 실패")).toBeInTheDocument();
  });

  it("consecutiveFailures 가 0 이면 문구를 보여주지 않는다", async () => {
    mockGetRuns.mockResolvedValue({ items: [baseRun] });
    render(<RunDayList />);

    await screen.findByText("정문 → 학원");
    expect(screen.queryByText(/연속 실패/)).not.toBeInTheDocument();
  });
});

describe("RunDayList — F02-07 기본 날짜는 한국 날짜", () => {
  afterEach(() => vi.useRealTimers());

  it("한국 시간 오전 8시(UTC 는 전날 23시)에 열면 날짜 칸이 한국의 오늘이고 그 날짜로 회차를 조회한다", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-15T23:00:00Z"));
    mockGetRuns.mockResolvedValue({ items: [] });
    render(<RunDayList />);

    expect(screen.getByLabelText("날짜")).toHaveValue("2026-09-16");
    expect(mockGetRuns).toHaveBeenCalledWith("2026-09-16");
  });
});

describe("RunDayList — F02-09 취소 버튼과 시각 표기", () => {
  it("운행 전·확정 회차에만 취소 버튼이 있고 이동 중·종료 회차에는 없다", async () => {
    mockGetRuns.mockResolvedValue({
      items: [
        { ...baseRun, id: "1", status: "idle", originName: "A" },
        { ...baseRun, id: "2", status: "confirmed", originName: "B" },
        { ...baseRun, id: "3", status: "moving", originName: "C" },
        { ...baseRun, id: "4", status: "finished", originName: "D" },
      ],
    });
    render(<RunDayList />);

    await screen.findByText("A → 학원");
    expect(screen.getAllByRole("button", { name: /회차 취소$/ })).toHaveLength(2);
    // 이미 시작된 회차는 버튼 대신 이유를 말한다.
    expect(screen.getAllByText("운행 시작됨")).toHaveLength(2);
  });

  it("출발·확정 시각을 공용 형식(시:분)으로 보여 준다", async () => {
    mockGetRuns.mockResolvedValue({ items: [baseRun] });
    render(<RunDayList />);

    expect(await screen.findByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("07:30")).toBeInTheDocument();
  });
});

// Ruling 836 · 시안 `schedule--runs` — 회차마다 시간표 막대(출발 → 도착 예정)와 오늘이면 현재 시각 세로선.
describe("RunDayList — 시간표 막대 열", () => {
  afterEach(() => vi.useRealTimers());

  // 한국 12:35 에 연다 — 두 회차(11:08 · 14:53, 각 40분)의 시간표는 11:00 ~ 16:00(300분)이다.
  const openAtNoon = async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-03T03:35:00Z"));
    mockGetRuns.mockResolvedValue({
      items: [
        { ...baseRun, id: "1", serviceDate: "2026-10-03", departTime: "2026-10-03T11:08:00+09:00", estDurationMin: 40, status: "finished" },
        { ...baseRun, id: "2", serviceDate: "2026-10-03", departTime: "2026-10-03T14:53:00+09:00", estDurationMin: 40, status: "idle" },
      ],
    });
    render(<RunDayList />);
    await screen.findAllByTestId("timetable-bar");
  };

  const percentOf = (element: HTMLElement, side: "left" | "width") => parseFloat(element.style[side]);

  it("막대가 회차의 출발 · 소요 위치에 그려지고 열 머리에 시간표 범위와 지금이 적힌다", async () => {
    await openAtNoon();

    const [first, second] = screen.getAllByTestId("timetable-bar");
    expect(percentOf(first, "left")).toBeCloseTo((8 / 300) * 100, 3);
    expect(percentOf(first, "width")).toBeCloseTo((40 / 300) * 100, 3);
    expect(percentOf(second, "left")).toBeCloseTo((233 / 300) * 100, 3);
    expect(screen.getByRole("columnheader", { name: "시간표 11:00 — 16:00 · 세로선 = 지금 12:35" })).toBeInTheDocument();
  });

  it("오늘이면 모든 행에 현재 시각(12:35) 세로선이 같은 자리에 있다", async () => {
    await openAtNoon();

    const lines = screen.getAllByTestId("timetable-now");
    expect(lines).toHaveLength(2);
    lines.forEach((line) => expect(percentOf(line, "left")).toBeCloseTo((95 / 300) * 100, 3));
  });

  it("오늘이 아닌 날짜를 보면 세로선 없이 막대만 그린다", async () => {
    await openAtNoon();

    fireEvent.click(screen.getByRole("button", { name: "다음날" }));

    await screen.findByRole("columnheader", { name: "시간표 11:00 — 16:00" });
    expect(screen.queryByTestId("timetable-now")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("timetable-bar")).toHaveLength(2);
  });
});
