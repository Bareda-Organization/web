import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSetupProgress } from "../api";
import { SetupChecklist } from "./SetupChecklist";

vi.mock("../api", () => ({ getSetupProgress: vi.fn() }));

const mockGetProgress = vi.mocked(getSetupProgress);

const progress = (overrides: Partial<Awaited<ReturnType<typeof getSetupProgress>>> = {}) => ({
  busCount: 0, managerCount: 0, studentCount: 0, routeCount: 0, scheduleCount: 0, schedulesWithoutRoute: 0, ...overrides,
});

// B1 #9 — 새 학원 대시보드는 0 과 빈 표뿐이라 어디부터 하는지 알 수 없었다. 차량 → 매니저 → 학생 → 노선 → 스케줄 순서를 알려 준다.
describe("SetupChecklist", () => {
  afterEach(() => vi.clearAllMocks());

  it("아무것도 없으면 다섯 단계를 순서대로 보이고, 끝낸 단계에는 완료 표시가 붙는다", async () => {
    mockGetProgress.mockResolvedValue(progress({ busCount: 2 }));
    render(<SetupChecklist />);

    const items = await screen.findAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("차량"),
      expect.stringContaining("매니저"),
      expect.stringContaining("학생"),
      expect.stringContaining("노선"),
      expect.stringContaining("스케줄"),
    ]);
    expect(items[0]).toHaveTextContent("완료");
    expect(items[1]).not.toHaveTextContent("완료");
    expect(screen.getByRole("link", { name: /매니저/ })).toHaveAttribute("href", "/manager");
  });

  it("다섯 단계를 모두 끝냈으면 아무것도 그리지 않는다", async () => {
    mockGetProgress.mockResolvedValue(progress({ busCount: 1, managerCount: 2, studentCount: 3, routeCount: 4, scheduleCount: 5 }));
    const { container } = render(<SetupChecklist />);

    await waitFor(() => expect(mockGetProgress).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("스케줄은 있는데 짝이 맞는 노선이 없으면 단계를 다 끝냈어도 경고를 남긴다", async () => {
    mockGetProgress.mockResolvedValue(
      progress({ busCount: 1, managerCount: 1, studentCount: 1, routeCount: 1, scheduleCount: 5, schedulesWithoutRoute: 3 }),
    );
    render(<SetupChecklist />);

    expect(await screen.findByText(/노선이 없는 스케줄 3건/)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /노선 편성/ })).toHaveAttribute("href", "/route");
  });

  it("조회에 실패하면 화면을 막지 않고 아무것도 그리지 않는다", async () => {
    mockGetProgress.mockRejectedValue(new Error("network"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<SetupChecklist />);

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    warn.mockRestore();
  });
});
