import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmLeave, setLeaveWarning } from "@/shared/lib/navigation/leaveGuard";
import { StudentForm } from "./StudentForm";
import { createStudent, getStudentDetail, updateStudent } from "../api";

// §5.11 STU-02·03 · API_SPEC §1.9 — 등록이 서버에서 거부되면 화면이 조용히
// onDone 을 호출해 넘어가지 않고 오류 문구를 보여줘야 한다.
vi.mock("@/features/auth", () => ({
  AccountPasswordResetDialog: ({ name }: { name: string }) => <div>초기화 확인: {name}</div>,
}));

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

// 2026-09-23 사용자 지시(Ruling 326) — 좌석은 없고, 연결된 보호자의 연락처를 고칠 수 있다.
describe("StudentForm — 보호자 연락처 수정", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("좌석 칸이 없고, 고친 보호자 연락처만 수정 요청에 싣는다", async () => {
    vi.mocked(getStudentDetail).mockResolvedValue({
      studentId: "1",
      name: "김바래",
      studentPhone: null,
      photoUrl: null,
      gender: null,
      birthDate: null,
      grade: null,
      className: null,
      note: null,
      canGoAlone: false,
      guardians: [
        { guardianId: "7", name: "최부모", phone: "010-1000-0001", accountId: "5" },
        { guardianId: "8", name: "정부모", phone: "010-1000-0002", accountId: "6" },
      ],
      accountId: null,
    });
    vi.mocked(updateStudent).mockResolvedValue({} as never);
    const onDone = vi.fn();

    render(<StudentForm studentId="1" onClose={vi.fn()} onDone={onDone} />);

    const 최부모 = await screen.findByLabelText("최부모 연락처");
    expect(screen.queryByText("좌석 번호")).not.toBeInTheDocument();
    fireEvent.change(최부모, { target: { value: "010-5555-0101" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(vi.mocked(updateStudent).mock.calls[0][1].guardians).toEqual([
      { guardianId: "7", phone: "010-5555-0101" },
    ]);
  });

  it("연결된 보호자가 없으면 그 사실과 연결 방법을 알린다", async () => {
    vi.mocked(getStudentDetail).mockResolvedValue({
      studentId: "1", name: "김바래", studentPhone: null, photoUrl: null, gender: null, birthDate: null, grade: null,
      className: null, note: null, canGoAlone: false, guardians: [], accountId: null,
    });

    render(<StudentForm studentId="1" onClose={vi.fn()} onDone={vi.fn()} />);

    expect(await screen.findByText(/연결된 보호자가 없습니다/)).toBeInTheDocument();
  });
});

// Ruling 329 — 관리자 경유 비밀번호 초기화(§5.22)의 진입점. 보호자·학생 계정마다 버튼이 있다.
describe("StudentForm — 비밀번호 초기화 진입점", () => {
  it("보호자 버튼을 누르면 그 보호자의 초기화 확인 창을 연다", async () => {
    vi.mocked(getStudentDetail).mockResolvedValue({
      studentId: "1",
      name: "김바래",
      studentPhone: null,
      photoUrl: null,
      gender: null,
      birthDate: null,
      grade: null,
      className: null,
      note: null,
      canGoAlone: false,
      guardians: [{ guardianId: "7", name: "최부모", phone: "010-1000-0001", accountId: "5" }],
      accountId: "10",
    });
    render(<StudentForm studentId="1" onClose={vi.fn()} onDone={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "최부모 비밀번호 초기화" }));

    expect(screen.getByText("초기화 확인: 최부모")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "학생 계정 비밀번호 초기화" })).toBeInTheDocument();
  });
});

// R32-W13 — 학생 등록·수정 폼도 저장하지 않은 채 앱 안에서 떠나면 입력이 조용히 사라졌다.
describe("StudentForm — 이탈 경고(R32-W13)", () => {
  afterEach(() => {
    setLeaveWarning(null);
    vi.restoreAllMocks();
  });

  it("아무것도 입력하지 않았으면 묻지 않고 떠난다", () => {
    const confirm = vi.spyOn(window, "confirm");
    render(<StudentForm onClose={vi.fn()} onDone={vi.fn()} />);

    expect(confirmLeave()).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("입력한 내용이 있으면 떠날 때 묻고, 취소하면 떠나지 않는다", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<StudentForm onClose={vi.fn()} onDone={vi.fn()} />);

    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "김바래" } });

    expect(confirmLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("입력한 채 취소를 눌러 창을 닫으려 하면 묻고, 취소하면 닫히지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onClose = vi.fn();
    render(<StudentForm onClose={onClose} onDone={vi.fn()} />);

    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "김바래" } });
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(onClose).not.toHaveBeenCalled();
  });
});

// F02-01 — PATCH 는 키가 없으면 "그대로 둔다"(Student.update). 지운 값을 키째 빼면 저장은 성공하는데 값이 남는다.
describe("StudentForm — F02-01 수정에서 값 지우기", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const filled = {
    studentId: "1",
    name: "김바래",
    studentPhone: "010-1111-2222",
    photoUrl: null,
    gender: "male" as const,
    birthDate: "2015-03-02",
    grade: "3학년",
    className: "2반",
    note: "알레르기",
    canGoAlone: false,
    guardians: [],
    accountId: null,
  };

  it("메모·학년·반을 지우고 저장하면 빈 문자열을 보내 서버 값을 지운다", async () => {
    vi.mocked(getStudentDetail).mockResolvedValue(filled);
    vi.mocked(updateStudent).mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(<StudentForm studentId="1" onClose={vi.fn()} onDone={onDone} />);

    fireEvent.change(await screen.findByDisplayValue("알레르기"), { target: { value: "" } });
    fireEvent.change(screen.getByDisplayValue("3학년"), { target: { value: "" } });
    fireEvent.change(screen.getByDisplayValue("2반"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const request = vi.mocked(updateStudent).mock.calls[0][1];
    expect(request.note).toBe("");
    expect(request.grade).toBe("");
    expect(request.className).toBe("");
  });

  it("원래 비어 있던 항목은 요청에 싣지 않는다", async () => {
    vi.mocked(getStudentDetail).mockResolvedValue({ ...filled, note: null, grade: null, className: null });
    vi.mocked(updateStudent).mockResolvedValue({} as never);
    const onDone = vi.fn();
    render(<StudentForm studentId="1" onClose={vi.fn()} onDone={onDone} />);

    await screen.findByDisplayValue("김바래");
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const request = vi.mocked(updateStudent).mock.calls[0][1];
    expect(request.note).toBeUndefined();
    expect(request.grade).toBeUndefined();
    expect(request.className).toBeUndefined();
  });

  it("서버가 지우지 못하는 학생 연락처·생년월일을 지우고 저장하면 요청 없이 그 사실을 알린다", async () => {
    vi.mocked(getStudentDetail).mockResolvedValue(filled);
    const onDone = vi.fn();
    render(<StudentForm studentId="1" onClose={vi.fn()} onDone={onDone} />);

    fireEvent.change(await screen.findByDisplayValue("010-1111-2222"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByText("학생 연락처·성별·생년월일은 지울 수 없습니다 — 다른 값으로만 바꿀 수 있습니다")).toBeInTheDocument();
    expect(updateStudent).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
