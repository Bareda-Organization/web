import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { BusList } from "./BusList";
import { getBuses } from "../api";

vi.mock("../api", () => ({ getBuses: vi.fn() }));
// 등록 창은 저장 완료만 흉내 낸다 — 저장한 차량의 id 를 목록에 넘기는 흐름만 본다.
vi.mock("./BusForm", () => ({
  BusForm: ({ onDone }: { onDone: (savedBusId?: string) => void }) => (
    <div role="dialog" aria-label="차량 등록 창">
      <button type="button" onClick={() => onDone("9")}>
        저장 완료
      </button>
    </div>
  ),
}));

const mockGetBuses = vi.mocked(getBuses);
const emptyPage = { items: [], page: 0, size: 20, totalCount: 0, hasNext: false };
const bus = (id: string, busNo: string) => ({ id, busNo, plateNo: `99가${id}`, capacity: 20, studentCapacity: 18, operable: true });

// R46-FUWEB B1 #11·#12·#19 — 차량 목록: 조회 실패 다시 시도 · 빈 상태 행동 · 저장한 차량 행 강조.
describe("BusList — 다시 시도 · 빈 상태 행동 · 저장 행 강조", () => {
  beforeEach(() => mockGetBuses.mockReset());

  it("조회에 실패하면 다시 시도 버튼이 있고, 누르면 다시 조회해 목록이 나온다", async () => {
    mockGetBuses.mockRejectedValueOnce(new ApiError(503, "UNAVAILABLE", "서버 오류"));
    render(<BusList />);
    await screen.findByText("서버 오류");

    mockGetBuses.mockResolvedValue({ ...emptyPage, items: [bus("1", "1호차")], totalCount: 1 });
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("1호차")).toBeInTheDocument();
  });

  it("차량이 없으면 차량 등록 버튼이 보이고, 저장하면 새로 생긴 그 행이 강조된다", async () => {
    mockGetBuses.mockResolvedValue(emptyPage);
    render(<BusList />);
    const emptyRow = (await screen.findByText("등록된 차량이 없습니다")).closest("tr")!;

    mockGetBuses.mockResolvedValue({ ...emptyPage, items: [bus("8", "8호차"), bus("9", "9호차")], totalCount: 2 });
    fireEvent.click(within(emptyRow).getByRole("button", { name: "차량 등록" }));
    fireEvent.click(await screen.findByRole("button", { name: "저장 완료" }));

    expect((await screen.findByText("9호차")).closest("tr")).toHaveAttribute("data-highlighted", "true");
    expect(screen.getByText("8호차").closest("tr")).not.toHaveAttribute("data-highlighted");
  });
});
