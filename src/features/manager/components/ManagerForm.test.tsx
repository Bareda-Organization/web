import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManagerForm } from "./ManagerForm";
import { createManager, updateManager } from "../api";
import { ApiError } from "@/shared/lib/http";
import type { ManagerItemResponseTypes } from "../types";

// §5.13 MGR-02·03 · API_SPEC §1.9 — 등록이 서버에서 거부되면 화면이 조용히
// onDone 을 호출해 넘어가지 않고 오류 문구를 보여줘야 한다.
vi.mock("../api", () => ({
  createManager: vi.fn(),
  updateManager: vi.fn(),
}));

const mockCreate = vi.mocked(createManager);
const mockUpdate = vi.mocked(updateManager);

const existingManager: ManagerItemResponseTypes = {
  id: "5",
  name: "김기사",
  phone: "010-1234-5678",
  role: "driver",
  workHours: null,
  accountId: null,
};

describe("ManagerForm — 등록 실패 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("등록이 거부되면 onDone 을 호출하지 않고 오류 문구를 보여준다", async () => {
    mockCreate.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));
    const onDone = vi.fn();

    render(<ManagerForm onClose={vi.fn()} onDone={onDone} />);

    // Input 컴포넌트는 라벨과 입력을 잇지 않아 getByLabelText 가 못 찾는다
    // (student/components/StudentForm.test.tsx 와 같은 우회) — 이름·전화번호
    // 순서로 짚는다. WorkHoursEditor 의 time 입력은 textbox 역할이 아니다.
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "김기사" } });
    fireEvent.change(textboxes[1], { target: { value: "010-1234-5678" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(screen.getByText("매니저 저장에 실패했습니다")).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });

  // W8 — API_SPEC §5.13 배치 중이면 역할 변경도 409 MANAGER_ASSIGNED(`Ruling
  // 339`, BR-022·023). 서버 문구가 삭제 전용이라(`ErrorCode.java:117`) 이 화면은
  // 수정 맥락에 맞는 전용 문구로 바꿔 보여준다(`ManagerDeleteDialog.tsx` 와 같은 판단).
  it("수정이 409 MANAGER_ASSIGNED 로 거부되면 배치 해제 안내 문구를 보여준다", async () => {
    mockUpdate.mockRejectedValue(new ApiError(409, "MANAGER_ASSIGNED", "회차에 배치된 매니저는 삭제할 수 없습니다"));
    const onDone = vi.fn();

    render(<ManagerForm manager={existingManager} onClose={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(
        screen.getByText("배치 중인 매니저는 역할을 바꿀 수 없습니다 — 배치를 먼저 해제"),
      ).toBeInTheDocument(),
    );
    expect(onDone).not.toHaveBeenCalled();
  });
});
