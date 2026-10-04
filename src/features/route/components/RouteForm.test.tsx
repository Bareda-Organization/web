import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteForm } from "./RouteForm";
import { createRoute, updateRoute } from "../api";
import { getBuses } from "@/features/bus/api";
import { ApiError } from "@/shared/lib/http";

// §5.9 RTE-01 · API_SPEC §1.9 — 편성 등록이 409 DUPLICATE_ROUTE 로 거부되면
// 화면이 조용히 onDone 을 호출해 넘어가지 않고, 이 화면만의 안내 문구
// ("같은 차량·요일·방향의 편성이 이미 있습니다.")를 보여줘야 한다.
vi.mock("../api", () => ({
  createRoute: vi.fn(),
  updateRoute: vi.fn(),
}));

vi.mock("@/features/bus/api", () => ({
  getBuses: vi.fn(),
}));

const mockCreate = vi.mocked(createRoute);
const mockGetBuses = vi.mocked(getBuses);

describe("RouteForm — 등록 실패 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("409 DUPLICATE_ROUTE 로 거부되면 onDone 을 호출하지 않고 전용 안내 문구를 보여준다", async () => {
    mockGetBuses.mockResolvedValue({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] }],
      page: 0,
      size: 100,
      totalCount: 1,
      hasNext: false,
    });
    mockCreate.mockRejectedValue(new ApiError(409, "DUPLICATE_ROUTE", "이미 있는 편성입니다"));
    const onDone = vi.fn();

    render(<RouteForm onClose={vi.fn()} onDone={onDone} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(screen.getByText("같은 차량·요일·방향의 편성이 이미 있습니다.")).toBeInTheDocument(),
    );
    expect(onDone).not.toHaveBeenCalled();
  });
});

// B1 #10 — 등록을 저장하면 목록으로 돌아가 정차지를 넣으러 다시 찾아 들어가야 했다. 만든 편성의 id 를 넘겨 상세로 이어 준다.
describe("RouteForm — 등록 뒤 이어가기", () => {
  afterEach(() => vi.clearAllMocks());

  it("등록에 성공하면 만든 편성의 id 를 onDone 에 넘긴다", async () => {
    mockGetBuses.mockResolvedValue({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] }],
      page: 0,
      size: 100,
      totalCount: 1,
      hasNext: false,
    });
    mockCreate.mockResolvedValue({ id: "42" } as Awaited<ReturnType<typeof createRoute>>);
    const onDone = vi.fn();
    render(<RouteForm onClose={vi.fn()} onDone={onDone} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).not.toBeDisabled());

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ id: "42" }));
  });
});

describe("RouteForm — F02-13 차량 목록 조회 실패", () => {
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
    render(<RouteForm onClose={vi.fn()} onDone={vi.fn()} />);

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
    render(<RouteForm onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText("차량이 100대를 넘어 앞의 100대만 보입니다")).toBeInTheDocument();
  });
});

// F02-17 — PATCH 는 키가 없으면 그대로 둔다. 지운 편성 이름을 키째 빼면 저장은 성공하는데 이름이 남는다.
describe("RouteForm — F02-17 편성 이름 지우기", () => {
  afterEach(() => vi.clearAllMocks());

  const route = { id: "5", busId: "1", busNo: "1호차", weekday: "mon" as const, direction: "to_academy" as const, name: "본선", active: true };

  it("수정에서 이름을 지우면 빈 문자열을 보내 서버 값을 지운다", async () => {
    mockGetBuses.mockResolvedValue({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] }],
      page: 0, size: 100, totalCount: 1, hasNext: false,
    });
    vi.mocked(updateRoute).mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(<RouteForm route={route} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.change(screen.getByDisplayValue("본선"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(vi.mocked(updateRoute).mock.calls[0][1].name).toBe("");
  });

  it("원래 이름이 없던 편성은 이름 키를 보내지 않는다", async () => {
    mockGetBuses.mockResolvedValue({
      items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] }],
      page: 0, size: 100, totalCount: 1, hasNext: false,
    });
    vi.mocked(updateRoute).mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(<RouteForm route={{ ...route, name: null }} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.click(await screen.findByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(vi.mocked(updateRoute).mock.calls[0][1].name).toBeUndefined();
  });
});

// B1 #7 — 월~금 운영 학원이 요일마다 폼을 다섯 번 열지 않도록 요일을 여러 개 골라 한 번에 만든다.
describe("RouteForm — B1 #7 요일 여러 개 한 번에", () => {
  afterEach(() => vi.clearAllMocks());

  const oneBus = {
    items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] }],
    page: 0, size: 100, totalCount: 1, hasNext: false,
  };

  it("월~금을 고르고 저장하면 요일마다 1건씩 5건을 만든다", async () => {
    mockGetBuses.mockResolvedValue(oneBus);
    mockCreate.mockResolvedValue({ id: "7" } as Awaited<ReturnType<typeof createRoute>>);
    const onBatchDone = vi.fn();
    render(<RouteForm onClose={vi.fn()} onDone={vi.fn()} onBatchDone={onBatchDone} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).not.toBeDisabled());

    for (const label of ["화", "수", "목", "금"]) fireEvent.click(screen.getByLabelText(label));
    // 여러 요일을 고르면 단추가 건수를 말한다(시안 "5건 저장").
    fireEvent.click(screen.getByRole("button", { name: "5건 저장" }));

    await waitFor(() => expect(onBatchDone).toHaveBeenCalled());
    expect(mockCreate.mock.calls.map(([request]) => request.weekday)).toEqual(["mon", "tue", "wed", "thu", "fri"]);
  });

  it("한 요일이 실패하면 그 요일과 사유를 보이고, 다시 저장하면 실패한 요일만 다시 만든다", async () => {
    mockGetBuses.mockResolvedValue(oneBus);
    mockCreate.mockImplementation(async (request) => {
      if (request.weekday === "tue") throw new ApiError(409, "DUPLICATE_ROUTE", "이미 있는 편성입니다");
      return { id: "7" } as Awaited<ReturnType<typeof createRoute>>;
    });
    const onBatchDone = vi.fn();
    render(<RouteForm onClose={vi.fn()} onDone={vi.fn()} onBatchDone={onBatchDone} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).not.toBeDisabled());

    for (const label of ["화", "수"]) fireEvent.click(screen.getByLabelText(label));
    fireEvent.click(screen.getByRole("button", { name: "3건 저장" }));

    expect(await screen.findByText(/화요일 — 같은 차량·요일·방향의 편성이 이미 있습니다/)).toBeInTheDocument();
    expect(onBatchDone).not.toHaveBeenCalled();

    mockCreate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].weekday).toBe("tue");
  });
});

// R48 — 요일표의 빈 칸에서 열면 그 칸으로 시작하고, 같은 차량 · 방향에서 이미 편성된 요일은 고를 수 없다.
describe("RouteForm — 시작 값 · 이미 편성된 요일", () => {
  afterEach(() => vi.clearAllMocks());
  const oneBus = {
    items: [{ id: "1", busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true, routeCount: 0, scheduleCount: 0, todayRuns: [] }],
    page: 0, size: 100, totalCount: 1, hasNext: false,
  };

  it("이미 편성된 요일은 비활성이고 저장에서 빠진다", async () => {
    mockGetBuses.mockResolvedValue(oneBus);
    mockCreate.mockResolvedValue({ id: "7" } as Awaited<ReturnType<typeof createRoute>>);
    render(
      <RouteForm
        onClose={vi.fn()}
        onDone={vi.fn()}
        onBatchDone={vi.fn()}
        initial={{ busId: "1", weekday: "tue", direction: "to_academy" }}
        existing={[{ busId: "1", weekday: "wed", direction: "to_academy" }]}
      />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).not.toBeDisabled());

    expect(screen.getByLabelText("수")).toBeDisabled();
    expect(screen.getByLabelText("화")).toBeChecked();
    fireEvent.click(screen.getByLabelText("목"));
    fireEvent.click(screen.getByRole("button", { name: "2건 저장" }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));
    expect(mockCreate.mock.calls.map(([request]) => request.weekday)).toEqual(["tue", "thu"]);
  });

  it("시작 요일이 이미 편성된 요일이면 선택에서 빠져 저장할 수 없고, 요일을 하나 더 고르면 그 요일만 만든다", async () => {
    mockGetBuses.mockResolvedValue(oneBus);
    mockCreate.mockResolvedValue({ id: "7" } as Awaited<ReturnType<typeof createRoute>>);
    render(
      <RouteForm onClose={vi.fn()} onDone={vi.fn()} onBatchDone={vi.fn()} initial={{ busId: "1", weekday: "wed", direction: "to_academy" }} existing={[{ busId: "1", weekday: "wed", direction: "to_academy" }]} />,
    );
    const save = await screen.findByRole("button", { name: "저장" });

    expect(screen.getByLabelText("수")).not.toBeChecked();
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByLabelText("금"));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].weekday).toBe("fri");
  });
});
