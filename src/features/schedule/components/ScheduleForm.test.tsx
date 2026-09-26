import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScheduleForm } from "./ScheduleForm";
import { createSchedule } from "../api";
import { getBuses } from "@/features/bus";
import { ApiError } from "@/shared/lib/http";

// §5.10 SCH-01 · API_SPEC §1.9 — 등록이 409 DUPLICATE_SCHEDULE 로 거부되면
// 화면이 조용히 onDone 을 호출해 넘어가지 않고, 이 화면만의 안내 문구를
// 보여줘야 한다.
vi.mock("../api", () => ({
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
}));

vi.mock("@/features/bus", () => ({
  getBuses: vi.fn(),
}));

const mockCreate = vi.mocked(createSchedule);
const mockGetBuses = vi.mocked(getBuses);

describe("ScheduleForm — 등록 실패 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("409 DUPLICATE_SCHEDULE 로 거부되면 onDone 을 호출하지 않고 전용 안내 문구를 보여준다", async () => {
    mockGetBuses.mockResolvedValue({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true }],
      page: 0,
      size: 100,
      totalCount: 1,
      hasNext: false,
    });
    mockCreate.mockRejectedValue(new ApiError(409, "DUPLICATE_SCHEDULE", "이미 있는 스케줄입니다"));
    const onDone = vi.fn();

    const { container } = render(<ScheduleForm onClose={vi.fn()} onDone={onDone} />);

    await waitFor(() => expect(screen.getAllByRole("textbox")).toHaveLength(2));

    // 출발 시각은 type="time" 이라 textbox·spinbutton 어느 역할에도 안 잡힌다 —
    // container 로 직접 짚는다(다른 화면들의 getByRole 우회와 같은 계열).
    const timeInput = container.querySelector('input[type="time"]');
    if (timeInput) fireEvent.change(timeInput, { target: { value: "08:00" } });

    const [originInput, destinationInput] = screen.getAllByRole("textbox");
    fireEvent.change(originInput, { target: { value: "정문" } });
    fireEvent.change(destinationInput, { target: { value: "학원" } });

    await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(screen.getByText("같은 차량·요일·방향·출발 시각의 스케줄이 이미 있습니다.")).toBeInTheDocument(),
    );
    expect(onDone).not.toHaveBeenCalled();
  });
});
