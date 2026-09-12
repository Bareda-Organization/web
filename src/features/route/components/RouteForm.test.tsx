import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteForm } from "./RouteForm";
import { createRoute } from "../api";
import { getBuses } from "@/features/bus";
import { ApiError } from "@/shared/lib/http";

// §5.9 RTE-01 · API_SPEC §1.9 — 편성 등록이 409 DUPLICATE_ROUTE 로 거부되면
// 화면이 조용히 onDone 을 호출해 넘어가지 않고, 이 화면만의 안내 문구
// ("같은 차량·요일·방향의 편성이 이미 있습니다.")를 보여줘야 한다.
vi.mock("../api", () => ({
  createRoute: vi.fn(),
  updateRoute: vi.fn(),
}));

vi.mock("@/features/bus", () => ({
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
      items: [{ id: 1, busNo: "1호차", plateNo: "12가3456", capacity: 20, studentCapacity: 18, operable: true }],
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
