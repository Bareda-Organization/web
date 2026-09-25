import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
