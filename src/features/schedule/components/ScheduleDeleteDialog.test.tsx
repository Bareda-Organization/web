import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScheduleDeleteDialog } from "./ScheduleDeleteDialog";

vi.mock("../api", () => ({ deleteSchedule: vi.fn() }));

// F02-08 — API_SPEC §5.10 "스케줄 변경의 반영"(Ruling 366 ②): 삭제하면 내일 이후 시작 전 회차가 취소 표시된다.
describe("ScheduleDeleteDialog — F02-08 삭제 확인 문구", () => {
  it("내일 이후 시작 전 회차가 취소 표시되고 오늘 회차는 그대로라고 알린다", () => {
    render(<ScheduleDeleteDialog scheduleId="1" onCancel={vi.fn()} onDeleted={vi.fn()} />);

    expect(screen.getByText(/내일 이후 시작 전 회차는 취소 표시됩니다/)).toBeInTheDocument();
    expect(screen.getByText(/오늘 회차와 이미 확정·시작된 회차는 그대로/)).toBeInTheDocument();
    expect(screen.queryByText(/이미 만들어진 회차는 그대로 남습니다/)).not.toBeInTheDocument();
  });
});
