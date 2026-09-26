import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
