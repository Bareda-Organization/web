import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBuses } from "@/features/bus/api";
import { ApiError } from "@/shared/lib/http";
import { RunAddForm } from "./RunAddForm";

vi.mock("../api", () => ({ createRun: vi.fn() }));
vi.mock("@/features/bus/api", () => ({ getBuses: vi.fn() }));

const mockGetBuses = vi.mocked(getBuses);

describe("RunAddForm — F02-13 차량 목록 조회 실패", () => {
  afterEach(() => vi.clearAllMocks());

  it("조회가 실패하면 오류와 [다시 시도] 를 보이고, 다시 시도가 성공하면 차량을 고를 수 있다", async () => {
    mockGetBuses.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR", "서버 오류"));
    mockGetBuses.mockResolvedValueOnce({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] }],
      page: 0,
      size: 100,
      totalCount: 1,
      hasNext: false,
    });
    render(<RunAddForm serviceDate="2026-09-16" onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText("차량 목록을 불러오지 못했습니다 — 서버 오류")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("option", { name: "1호차 (12가3456)" })).toBeInTheDocument();
    expect(screen.queryByText(/차량 목록을 불러오지 못했습니다/)).not.toBeInTheDocument();
  });

  it("차량이 100대를 넘으면 일부만 보인다고 알린다", async () => {
    mockGetBuses.mockResolvedValue({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] }],
      page: 0,
      size: 100,
      totalCount: 130,
      hasNext: true,
    });
    render(<RunAddForm serviceDate="2026-09-16" onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText("차량이 100대를 넘어 앞의 100대만 보입니다")).toBeInTheDocument();
  });
});
