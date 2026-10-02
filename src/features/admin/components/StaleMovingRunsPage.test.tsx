import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaleMovingRunsPage } from "./StaleMovingRunsPage";
import { forceFinishRun, getStaleMovingRuns } from "../api";
import { ApiError } from "@/shared/lib/http";
import type { StaleMovingRunItemResponseTypes } from "../types";

// §6.16·§6.17(Ruling 724) — 목록 표 · [강제 종료] → 사유 필수 확인 대화상자 · 성공하면 그 행이 사라지고 저장 알림 · 실패는 서버 메시지 · 빈 상태.
// 되돌릴 수 없는 동작이라 렌더 여부가 아니라 사유 없이는 실행할 수 없는지, 성공 뒤 행이 실제로 빠지는지, 실패 때 행이 남는지를 본다.
vi.mock("../api", () => ({
  getStaleMovingRuns: vi.fn(),
  forceFinishRun: vi.fn(),
}));

const mockGetRuns = vi.mocked(getStaleMovingRuns);
const mockForceFinish = vi.mocked(forceFinishRun);

const run = (overrides: Partial<StaleMovingRunItemResponseTypes>): StaleMovingRunItemResponseTypes => ({
  runId: "42",
  academyId: "1",
  academyName: "바래다학원",
  serviceDate: "2026-09-28",
  direction: "from_academy",
  busNo: "701호",
  startedAt: "2026-09-28T09:00:00Z",
  finishPending: false,
  boardedCount: 2,
  ...overrides,
});

const open강제종료 = async (busNo: string) => {
  const row = (await screen.findByText(busNo)).closest("tr") as HTMLElement;
  fireEvent.click(within(row).getByRole("button", { name: "강제 종료" }));
};

describe("StaleMovingRunsPage — 끝나지 않은 회차 강제 종료", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("목록에 학원·운행일·방향·남은 탑승자 수·종료 보류를 보여준다", async () => {
    mockGetRuns.mockResolvedValue({ items: [run({ finishPending: true })] });

    render(<StaleMovingRunsPage />);

    expect(await screen.findByText("바래다학원")).toBeInTheDocument();
    expect(screen.getByText("2026-09-28")).toBeInTheDocument();
    expect(screen.getByText("하원")).toBeInTheDocument();
    expect(screen.getByText("2명 미하차")).toBeInTheDocument();
    expect(screen.getByText("종료 보류")).toBeInTheDocument();
  });

  it("대상이 없으면 빈 상태 문구를 보여준다", async () => {
    mockGetRuns.mockResolvedValue({ items: [] });

    render(<StaleMovingRunsPage />);

    expect(await screen.findByText("끝나지 않은 회차가 없습니다")).toBeInTheDocument();
  });

  it("대화상자는 남은 탑승자 수를 경고하고 사유가 비면 실행 버튼이 비활성이다", async () => {
    mockGetRuns.mockResolvedValue({ items: [run({ boardedCount: 3 })] });
    render(<StaleMovingRunsPage />);

    await open강제종료("701호");

    expect(screen.getByText(/아직 탑승 중인 3명은 하차 처리 없이 그대로 남고/)).toBeInTheDocument();
    const execute = screen.getByRole("button", { name: "강제 종료 실행" });
    expect(execute).toBeDisabled();
    fireEvent.change(screen.getByLabelText("강제 종료 사유"), { target: { value: "   " } });
    expect(execute).toBeDisabled();
    fireEvent.change(screen.getByLabelText("강제 종료 사유"), { target: { value: "학원 확인 완료" } });
    expect(execute).toBeEnabled();
  });

  it("성공하면 그 행이 목록에서 사라지고 저장 알림이 뜬다", async () => {
    mockGetRuns
      .mockResolvedValueOnce({ items: [run({}), run({ runId: "43", busNo: "702호" })] })
      .mockResolvedValueOnce({ items: [run({ runId: "43", busNo: "702호" })] });
    mockForceFinish.mockResolvedValue({ runId: "42", finishedAt: "2026-10-02T03:00:00Z", boardedCount: 2 });
    render(<StaleMovingRunsPage />);

    await open강제종료("701호");
    fireEvent.change(screen.getByLabelText("강제 종료 사유"), { target: { value: "학원 확인 완료" } });
    fireEvent.click(screen.getByRole("button", { name: "강제 종료 실행" }));

    await waitFor(() => expect(screen.queryByText("701호")).not.toBeInTheDocument());
    expect(mockForceFinish).toHaveBeenCalledWith("42", "학원 확인 완료");
    expect(screen.getByText("바래다학원 701호 회차를 종료했습니다")).toBeInTheDocument();
    expect(screen.getByText("702호")).toBeInTheDocument();
  });

  it("실패하면 서버 메시지를 대화상자에 보여주고 행은 그대로 남는다", async () => {
    mockGetRuns.mockResolvedValue({ items: [run({})] });
    mockForceFinish.mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "서버 내부 오류입니다"));
    render(<StaleMovingRunsPage />);

    await open강제종료("701호");
    fireEvent.change(screen.getByLabelText("강제 종료 사유"), { target: { value: "학원 확인 완료" } });
    fireEvent.click(screen.getByRole("button", { name: "강제 종료 실행" }));

    expect(await screen.findByText("서버 내부 오류입니다")).toBeInTheDocument();
    expect(mockGetRuns).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("701호").length).toBeGreaterThan(0);
  });

  it("RUN_NOT_MOVING 은 이미 끝난 회차라는 안내 문구로 보여준다", async () => {
    mockGetRuns.mockResolvedValue({ items: [run({})] });
    mockForceFinish.mockRejectedValue(new ApiError(409, "RUN_NOT_MOVING", "conflict"));
    render(<StaleMovingRunsPage />);

    await open강제종료("701호");
    fireEvent.change(screen.getByLabelText("강제 종료 사유"), { target: { value: "학원 확인 완료" } });
    fireEvent.click(screen.getByRole("button", { name: "강제 종료 실행" }));

    expect(await screen.findByText("이미 끝났거나 이동 중이 아닌 회차입니다 — 닫고 목록을 다시 확인하세요.")).toBeInTheDocument();
  });
});
