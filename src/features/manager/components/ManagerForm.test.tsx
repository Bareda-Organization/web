import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ManagerForm } from "./ManagerForm";
import { createManager } from "../api";

// §5.13 MGR-02·03 · API_SPEC §1.9 — 등록이 서버에서 거부되면 화면이 조용히
// onDone 을 호출해 넘어가지 않고 오류 문구를 보여줘야 한다.
vi.mock("../api", () => ({
  createManager: vi.fn(),
  updateManager: vi.fn(),
}));

const mockCreate = vi.mocked(createManager);

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
});
