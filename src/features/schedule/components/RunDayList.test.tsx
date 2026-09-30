import { render, screen } from "@testing-library/react";
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
    expect(screen.getAllByRole("button", { name: "취소" })).toHaveLength(2);
  });

  it("출발·확정 시각을 공용 형식(시:분)으로 보여 준다", async () => {
    mockGetRuns.mockResolvedValue({ items: [baseRun] });
    render(<RunDayList />);

    expect(await screen.findByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("07:30")).toBeInTheDocument();
  });
});
