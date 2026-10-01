import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoute } from "../api";
import { ApiError } from "@/shared/lib/http";
import { RouteCopyDialog } from "./RouteCopyDialog";

vi.mock("../api", () => ({ createRoute: vi.fn() }));

const mockCreate = vi.mocked(createRoute);

const source = {
  id: "5",
  busId: "1",
  busNo: "1호차",
  weekday: "mon" as const,
  direction: "to_academy" as const,
  name: "본선",
  active: true,
  stops: [
    { stopId: "11", seq: 1, name: "가 정류장", lat: 37.1, lng: 127.1 },
    { stopId: "12", seq: 2, name: "나 정류장", lat: 37.2, lng: 127.2 },
  ],
};

// B1 #7 — 월요일에 정차지까지 편성해 둔 노선을 다른 요일로 복사한다. 정차지 순서까지 같이 간다.
describe("RouteCopyDialog", () => {
  afterEach(() => vi.clearAllMocks());

  it("고른 요일마다 같은 차량·방향·이름·정차지 순서로 1건씩 만든다", async () => {
    mockCreate.mockResolvedValue({ id: "9" } as Awaited<ReturnType<typeof createRoute>>);
    const onDone = vi.fn();
    render(<RouteCopyDialog route={source} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.click(screen.getByLabelText("화"));
    fireEvent.click(screen.getByLabelText("수"));
    fireEvent.click(screen.getByRole("button", { name: "복사" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockCreate.mock.calls.map(([request]) => request)).toEqual([
      { busId: "1", weekday: "tue", direction: "to_academy", name: "본선", active: true, stopIds: ["11", "12"] },
      { busId: "1", weekday: "wed", direction: "to_academy", name: "본선", active: true, stopIds: ["11", "12"] },
    ]);
  });

  it("원본 요일은 고를 수 없고, 한 요일이 이미 있으면 그 요일만 실패로 보인다", async () => {
    mockCreate.mockImplementation(async (request) => {
      if (request.weekday === "wed") throw new ApiError(409, "DUPLICATE_ROUTE", "이미 있는 편성입니다");
      return { id: "9" } as Awaited<ReturnType<typeof createRoute>>;
    });
    const onDone = vi.fn();
    render(<RouteCopyDialog route={source} onClose={vi.fn()} onDone={onDone} />);

    expect(screen.getByLabelText("월")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("화"));
    fireEvent.click(screen.getByLabelText("수"));
    fireEvent.click(screen.getByRole("button", { name: "복사" }));

    expect(await screen.findByText(/수요일 — 같은 차량·요일·방향의 편성이 이미 있습니다/)).toBeInTheDocument();
    expect(screen.queryByText(/화요일 —/)).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
