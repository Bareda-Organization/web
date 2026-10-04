import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentWithdrawDialog } from "./StudentWithdrawDialog";
import { deleteStudent, getWithdrawalPreview } from "../api";

vi.mock("../api", () => ({ deleteStudent: vi.fn(), getWithdrawalPreview: vi.fn() }));

const mockPreview = vi.mocked(getWithdrawalPreview);
const mockDelete = vi.mocked(deleteStudent);

const student = { studentId: "5", name: "구로운", className: "초등 심화반 A", guardianPhone: null, guardianCount: 1, grade: null, canGoAlone: false, accountLinked: true, weeklyAddressStatus: "complete" as const };
const run = (busNo: string, direction: "to_academy" | "from_academy", departTime: string) => ({ runId: "1", busNo, direction, departTime, status: "idle", stopName: "반달마을 선경아파트 정문" });

// Ruling 815 — 퇴원 확인 창이 오늘(명단 유지) · 내일(명단 제외)의 영향을 미리 보인다.
describe("StudentWithdrawDialog — 퇴원 미리보기", () => {
  afterEach(() => vi.clearAllMocks());

  it("오늘 남은 운행과 내일 빠지는 승하차지 인원 변화를 보여 준다", async () => {
    mockPreview.mockResolvedValue({
      todayRuns: [run("1호차", "from_academy", "2026-10-03T13:13:00+09:00")],
      tomorrowRuns: [run("1호차", "to_academy", "2026-10-04T11:08:00+09:00"), run("1호차", "from_academy", "2026-10-04T13:13:00+09:00")],
    });
    render(<StudentWithdrawDialog student={student} onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText(/남은 운행 1회\(1호차 하원 13:13\)에 계속 표시/)).toBeInTheDocument();
    expect(screen.getByText(/등원 · 하원 모두. 1호차 “반달마을 선경아파트 정문” 인원 −1명/)).toBeInTheDocument();
    expect(screen.getByText("명단 유지")).toBeInTheDocument();
    expect(screen.getByText("명단 제외")).toBeInTheDocument();
  });

  it("미리보기를 못 받아도 고정 문구로 퇴원을 확인할 수 있다", async () => {
    mockPreview.mockRejectedValue(new Error("offline"));
    mockDelete.mockResolvedValue(undefined);
    const onDone = vi.fn();
    render(<StudentWithdrawDialog student={student} onClose={vi.fn()} onDone={onDone} />);

    expect(await screen.findByText(/오늘 명단은 유지되고 내일 운행부터 제외됩니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "퇴원 처리" }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("5"));
    expect(onDone).toHaveBeenCalled();
  });
});
