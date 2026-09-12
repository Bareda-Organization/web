import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForcedAddDialog } from "./ForcedAddDialog";
import { postForcedAdd } from "../api";

// §5.7 은 student_id · new_student.name 이 배타적이라(라디오 두 값 중 하나만 서버로
// 간다) 이 화면의 핵심 검증 대상은 "선택한 모드에 맞는 필드만 실어 보내는가" 다.
// 되돌릴 수 없는 조작이라 확정 단계(다음→확정)를 거치는 흐름도 함께 본다.
vi.mock("../api", () => ({
  postForcedAdd: vi.fn(),
}));

const mockPostForcedAdd = vi.mocked(postForcedAdd);

describe("ForcedAddDialog — 배타 모드·확정 흐름", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("기존 학생 모드에서 확정하면 studentId 만 싣고 newStudentName 은 undefined 다", async () => {
    mockPostForcedAdd.mockResolvedValue({
      forcedAdditionId: 1,
      runId: 7,
      studentId: 101,
      stopId: 1,
      status: "staged",
    });
    render(<ForcedAddDialog runId={7} open onClose={vi.fn()} onDone={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "101" } });
    fireEvent.change(inputs[1], { target: { value: "서울시 정문로 1" } });

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "확정하고 추가" }));

    await waitFor(() =>
      expect(mockPostForcedAdd).toHaveBeenCalledWith(7, {
        studentId: 101,
        newStudentName: undefined,
        address: "서울시 정문로 1",
        note: undefined,
      }),
    );
  });

  it("신규 학생 모드로 전환하면 newStudentName 을 싣고 studentId 는 undefined 다", async () => {
    mockPostForcedAdd.mockResolvedValue({
      forcedAdditionId: 2,
      runId: 7,
      studentId: 999,
      stopId: 2,
      status: "staged",
    });
    render(<ForcedAddDialog runId={7} open onClose={vi.fn()} onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole("tab", { name: "신규 학생" }));
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "새학생" } });
    fireEvent.change(inputs[1], { target: { value: "서울시 후문로 2" } });

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "확정하고 추가" }));

    await waitFor(() =>
      expect(mockPostForcedAdd).toHaveBeenCalledWith(7, {
        studentId: undefined,
        newStudentName: "새학생",
        address: "서울시 후문로 2",
        note: undefined,
      }),
    );
  });

  it("주소를 입력하지 않으면 다음 버튼이 비활성 상태다", () => {
    render(<ForcedAddDialog runId={7} open onClose={vi.fn()} onDone={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "101" } });

    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });
});
