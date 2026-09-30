import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScheduleForm } from "./ScheduleForm";
import { createSchedule, updateSchedule } from "../api";
import { getBuses } from "@/features/bus/api";
import { ApiError } from "@/shared/lib/http";

// §5.10 SCH-01 · API_SPEC §1.9 — 등록이 409 DUPLICATE_SCHEDULE 로 거부되면
// 화면이 조용히 onDone 을 호출해 넘어가지 않고, 이 화면만의 안내 문구를
// 보여줘야 한다.
vi.mock("../api", () => ({
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
}));

vi.mock("@/features/bus/api", () => ({
  getBuses: vi.fn(),
}));

const mockCreate = vi.mocked(createSchedule);
const mockUpdate = vi.mocked(updateSchedule);
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

describe("ScheduleForm — F02-08 수정 반영 안내", () => {
  const busPage = {
    items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true }],
    page: 0,
    size: 100,
    totalCount: 1,
    hasNext: false,
  };
  const schedule = {
    id: "9",
    busId: "1",
    busNo: "1호차",
    weekday: "mon" as const,
    direction: "to_academy" as const,
    departTime: "08:00",
    originName: "정문",
    destinationName: "학원",
    estDurationMin: 20,
    active: true,
  };

  afterEach(() => vi.clearAllMocks());

  it("수정 폼은 비활성·요일·방향 변경이 내일 이후 시작 전 회차를 취소 표시한다고 미리 알린다", async () => {
    mockGetBuses.mockResolvedValue(busPage);
    render(<ScheduleForm schedule={schedule} onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText(/내일 이후 시작 전 회차는 취소 표시됩니다/)).toBeInTheDocument();
  });

  it("등록 폼에는 반영 안내가 없다", async () => {
    mockGetBuses.mockResolvedValue(busPage);
    render(<ScheduleForm onClose={vi.fn()} onDone={vi.fn()} />);

    await waitFor(() => expect(mockGetBuses).toHaveBeenCalled());
    expect(screen.queryByText(/내일 이후 시작 전 회차는 취소 표시됩니다/)).not.toBeInTheDocument();
  });

  it("409 DUPLICATE_RUN 이면 스케줄 변경이 전부 취소됐다는 전용 문구를 보여 준다", async () => {
    mockGetBuses.mockResolvedValue(busPage);
    mockUpdate.mockRejectedValue(new ApiError(409, "DUPLICATE_RUN", "이미 있는 회차입니다"));
    render(<ScheduleForm schedule={schedule} onClose={vi.fn()} onDone={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(
      await screen.findByText(/다른 회차\(임시 회차 등\)가 이미 그 자리를 차지해 스케줄 변경 전체가 반영되지 않았습니다/),
    ).toBeInTheDocument();
  });
});

describe("ScheduleForm — F02-13 차량 목록 조회 실패", () => {
  afterEach(() => vi.clearAllMocks());

  it("조회가 실패하면 오류와 [다시 시도] 를 보이고, 다시 시도가 성공하면 차량을 고를 수 있다", async () => {
    mockGetBuses.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR", "서버 오류"));
    mockGetBuses.mockResolvedValueOnce({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true }],
      page: 0,
      size: 100,
      totalCount: 1,
      hasNext: false,
    });
    render(<ScheduleForm onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText("차량 목록을 불러오지 못했습니다 — 서버 오류")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("option", { name: "1호차 (12가3456)" })).toBeInTheDocument();
    expect(screen.queryByText(/차량 목록을 불러오지 못했습니다/)).not.toBeInTheDocument();
  });

  it("차량이 100대를 넘으면 일부만 보인다고 알린다", async () => {
    mockGetBuses.mockResolvedValue({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true }],
      page: 0,
      size: 100,
      totalCount: 130,
      hasNext: true,
    });
    render(<ScheduleForm onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText("차량이 100대를 넘어 앞의 100대만 보입니다")).toBeInTheDocument();
  });
});

// F02-17 · Z-01(Ruling 390) — 선택 항목에 `null` 을 명시하면 서버가 지운다. 비운 소요시간은 키를 빼지 않고 null 로 보낸다.
describe("ScheduleForm — F02-17 예상 소요시간 지우기", () => {
  afterEach(() => vi.clearAllMocks());

  it("소요시간을 비우고 저장하면 estDurationMin 을 null 로 보내 서버 값을 지운다", async () => {
    mockGetBuses.mockResolvedValue({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true }],
      page: 0, size: 100, totalCount: 1, hasNext: false,
    });
    mockUpdate.mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(
      <ScheduleForm
        schedule={{
          id: "9", busId: "1", busNo: "1호차", weekday: "mon", direction: "to_academy", departTime: "08:00",
          originName: "정문", destinationName: "학원", estDurationMin: 20, active: true,
        }}
        onClose={vi.fn()}
        onDone={onDone}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("20"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][1].estDurationMin).toBeNull();
  });
});
