import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSchedule } from "../api";
import { ApiError } from "@/shared/lib/http";
import { ScheduleCopyDialog } from "./ScheduleCopyDialog";

vi.mock("../api", () => ({ createSchedule: vi.fn() }));

const mockCreate = vi.mocked(createSchedule);

const source = {
  id: "3",
  busId: "1",
  busNo: "1호차",
  weekday: "mon" as const,
  direction: "to_academy" as const,
  departTime: "08:00",
  originName: "정문",
  destinationName: "학원",
  estDurationMin: 30,
  active: true,
};

// B1 #7 — 월요일 스케줄을 다른 요일로 복사한다. 출발 시각·출발지·도착지·소요시간이 그대로 간다.
describe("ScheduleCopyDialog", () => {
  afterEach(() => vi.clearAllMocks());

  it("고른 요일마다 같은 내용으로 1건씩 만든다", async () => {
    mockCreate.mockResolvedValue({} as Awaited<ReturnType<typeof createSchedule>>);
    const onDone = vi.fn();
    render(<ScheduleCopyDialog schedule={source} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.click(screen.getByLabelText("화"));
    fireEvent.click(screen.getByLabelText("목"));
    fireEvent.click(screen.getByRole("button", { name: "복사" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockCreate.mock.calls.map(([request]) => request)).toEqual([
      { busId: "1", weekday: "tue", direction: "to_academy", departTime: "08:00", originName: "정문", destinationName: "학원", estDurationMin: 30, active: true },
      { busId: "1", weekday: "thu", direction: "to_academy", departTime: "08:00", originName: "정문", destinationName: "학원", estDurationMin: 30, active: true },
    ]);
  });

  it("원본 요일은 고를 수 없고, 이미 있는 요일은 그 요일만 실패로 보인다", async () => {
    mockCreate.mockImplementation(async (request) => {
      if (request.weekday === "thu") throw new ApiError(409, "DUPLICATE_SCHEDULE", "이미 있는 스케줄입니다");
      return {} as Awaited<ReturnType<typeof createSchedule>>;
    });
    const onDone = vi.fn();
    render(<ScheduleCopyDialog schedule={source} onClose={vi.fn()} onDone={onDone} />);

    expect(screen.getByLabelText("월")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("화"));
    fireEvent.click(screen.getByLabelText("목"));
    fireEvent.click(screen.getByRole("button", { name: "복사" }));

    expect(await screen.findByText(/목요일 — 같은 차량·요일·방향·출발 시각의 스케줄이 이미 있습니다/)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
