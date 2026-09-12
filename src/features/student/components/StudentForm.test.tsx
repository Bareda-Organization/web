import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudentForm } from "./StudentForm";
import { createStudent } from "../api";

// §5.11 STU-02·03 · API_SPEC §1.9 — 등록이 서버에서 거부되면 화면이 조용히
// onDone 을 호출해 넘어가지 않고 오류 문구를 보여줘야 한다.
vi.mock("../api", () => ({
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  getStudentDetail: vi.fn(),
}));

const mockCreate = vi.mocked(createStudent);

describe("StudentForm — 등록 실패 갈래", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("등록이 거부되면 onDone 을 호출하지 않고 오류 문구를 보여준다", async () => {
    mockCreate.mockRejectedValue(new Error("네트워크 요청이 실패했습니다"));
    const onDone = vi.fn();

    render(<StudentForm onClose={vi.fn()} onDone={onDone} />);

    // Input 컴포넌트는 라벨과 입력을 <label htmlFor> 로 잇지 않아 getByLabelText 가
    // 못 찾는다(shared/ui/forms/Input.tsx 실측 확인) — 폼의 첫 텍스트 입력(이름)을
    // 순서로 짚는다. ForcedAddDialog.test.tsx 의 getAllByRole("textbox") 선례와 같은 방식.
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "김바래" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(screen.getByText("학생 정보 저장에 실패했습니다")).toBeInTheDocument());
    expect(onDone).not.toHaveBeenCalled();
  });
});
