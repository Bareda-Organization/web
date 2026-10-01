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

// F02-12 — 하루 두 구간을 가진 매니저를 수정할 때 첫 구간만 남기고 나머지를 지우면 배치 충돌 경고의 근거가 조용히 줄어든다.
describe("ManagerForm — F02-12 근무 시간 편집", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const twoRanges: ManagerItemResponseTypes = {
    ...existingManager,
    workHours: {
      mon: [
        { start: "06:00", end: "09:00" },
        { start: "14:00", end: "18:00" },
      ],
    },
  };

  it("첫 구간의 시간을 고쳐도 같은 요일의 둘째 구간은 그대로 저장된다", async () => {
    mockUpdate.mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(<ManagerForm manager={twoRanges} onClose={vi.fn()} onDone={onDone} />);

    fireEvent.change(screen.getByDisplayValue("06:00"), { target: { value: "07:00" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][1].workHours?.mon).toEqual([
      { start: "07:00", end: "09:00" },
      { start: "14:00", end: "18:00" },
    ]);
  });

  it("시작이 끝보다 늦으면 이유를 보이고 저장을 막는다", () => {
    render(<ManagerForm manager={twoRanges} onClose={vi.fn()} onDone={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue("06:00"), { target: { value: "10:00" } });

    expect(screen.getByText("근무 시작이 끝보다 빨라야 합니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });
});

// N-07 — 수정 폼에서 이름·전화번호를 지운 채 저장하면 서버가 422 로 거부한다. 요청이 나가기 전에 저장 버튼이 막혀야 한다.
describe("ManagerForm — 수정 폼의 빈 값", () => {
  afterEach(() => vi.clearAllMocks());

  it("이름이나 전화번호를 공백으로 지우면 저장 버튼이 잠기고 요청이 나가지 않는다", () => {
    render(<ManagerForm manager={existingManager} onClose={vi.fn()} onDone={vi.fn()} />);
    const [nameInput, phoneInput] = screen.getAllByRole("textbox");
    const save = screen.getByRole("button", { name: "저장" });
    expect(save).toBeEnabled();

    fireEvent.change(nameInput, { target: { value: "   " } });
    expect(save).toBeDisabled();
    fireEvent.change(nameInput, { target: { value: "김기사" } });
    fireEvent.change(phoneInput, { target: { value: "" } });
    expect(save).toBeDisabled();

    fireEvent.click(save);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// B1 #8 — 등록 폼에는 아이디·비밀번호가 없다. 앱 연결이 어떻게 이뤄지는지 한 줄로 알려 줘야 첫날 막히지 않는다.
describe("ManagerForm — 앱 연결 안내", () => {
  it("등록 폼에는 앱에서 가입 신청하면 승인 때 이 기록에 연결된다는 안내가 있다", () => {
    render(<ManagerForm onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(/앱에서 가입 신청하면/)).toBeInTheDocument();
  });

  it("이미 있는 매니저를 고치는 폼에는 그 안내가 없다", () => {
    render(<ManagerForm manager={existingManager} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByText(/앱에서 가입 신청하면/)).not.toBeInTheDocument();
  });
});
