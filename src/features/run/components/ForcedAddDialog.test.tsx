import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForcedAddDialog } from "./ForcedAddDialog";
import { ApiError } from "@/shared/lib/http";
import { postForcedAdd, searchStudents } from "../api";

// §5.7 은 student_id · new_student.name 이 배타적이라(라디오 두 값 중 하나만 서버로
// 간다) 이 화면의 핵심 검증 대상은 "선택한 모드에 맞는 필드만 실어 보내는가" 다.
// 되돌릴 수 없는 조작이라 확정 단계(다음→확정)를 거치는 흐름도 함께 본다.
vi.mock("../api", () => ({
  postForcedAdd: vi.fn(),
  searchStudents: vi.fn(),
}));

// R46-FUWEB B1 #25 — 승하차 주소는 노선 편성과 같은 주소 검색에서 후보를 골라 정한다(직접 입력해 확정 단계에서 틀렸다고 알게 되던 흐름을 없앤다).
// 검색 상자 자체는 `StopAddressSearch.test.tsx` 가 본다 — 여기서는 고른 후보의 주소가 서버로 가는 흐름만 본다.
vi.mock("@/features/route", () => ({
  StopAddressSearch: ({ onPick }: { onPick: (suggestion: { displayName: string; lat: number; lng: number; nearby: [] }) => void }) => (
    <button type="button" onClick={() => onPick({ displayName: "서울시 정문로 1", lat: 37.5, lng: 127.0, nearby: [] })}>
      주소 후보 고르기
    </button>
  ),
}));

const mockPostForcedAdd = vi.mocked(postForcedAdd);
const mockSearchStudents = vi.mocked(searchStudents);

// F01-07 — 기존 학생은 내부 ID 를 외워 입력하지 않고 이름으로 찾아 고른다(USER_FLOWS UF-M-03 "검색·연동이 기본").
const pickExistingStudent = async () => {
  mockSearchStudents.mockResolvedValue([{ studentId: "101", name: "김철수", className: "1반" }]);
  fireEvent.change(screen.getByLabelText("학생 이름 검색"), { target: { value: "김철" } });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  fireEvent.click(await screen.findByRole("button", { name: "김철수 · 1반" }));
};

describe("ForcedAddDialog — 배타 모드·확정 흐름", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // R46-LAST Ruling 583 — 이 칸은 퇴원 파기 대상 밖이라 입력 단계에서 개인정보를 줄인다.
  it("메모 칸 아래에 학생 이름·연락처를 적지 말라고 안내한다", () => {
    render(<ForcedAddDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByText(/학생 이름·연락처는 적지 마세요/)).toBeInTheDocument();
  });

  it("기존 학생 모드에서 이름으로 찾아 고르고 확정하면 studentId 만 싣고 newStudentName 은 undefined 다", async () => {
    mockPostForcedAdd.mockResolvedValue({
      forcedAdditionId: "1",
      runId: "7",
      studentId: "101",
      stopId: "1",
      status: "staged",
    });
    render(<ForcedAddDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    await pickExistingStudent();
    fireEvent.click(screen.getByRole("button", { name: "주소 후보 고르기" }));

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    // 확정 단계에는 ID 숫자가 아니라 학생 이름이 보인다.
    expect(screen.getByText(/김철수/)).toBeInTheDocument();
    expect(screen.queryByText(/학생 ID/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "확정하고 추가" }));

    await waitFor(() =>
      expect(mockPostForcedAdd).toHaveBeenCalledWith("7", {
        studentId: "101",
        newStudentName: undefined,
        address: "서울시 정문로 1",
        note: undefined,
      }),
    );
  });

  it("검색 결과가 없으면 없다고 알린다", async () => {
    mockSearchStudents.mockResolvedValue([]);
    render(<ForcedAddDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("학생 이름 검색"), { target: { value: "없는이름" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(await screen.findByText("검색 결과가 없습니다")).toBeInTheDocument();
  });

  it.each([
    ["CHANGE_WINDOW_CLOSED", 403, "출발 30분 전이 지나 추가할 수 없습니다"],
    ["CAPACITY_EXCEEDED", 409, "버스 정원이 가득 차 추가할 수 없습니다"],
    ["ADDRESS_VERIFICATION_FAILED", 422, "주소를 확인하지 못했습니다. 주소를 다시 확인해 주세요"],
    ["RUN_CANCELED", 409, "취소된 회차라 추가할 수 없습니다"],
    ["FORCED_ADDITION_ALREADY_STAGED", 409, "이 학생은 이 회차에 이미 강제 추가 대기 중입니다"],
  ])("%s 는 서버 원문이 아니라 쉬운 한국어 문구로 알린다", async (code, status, message) => {
    mockPostForcedAdd.mockRejectedValue(new ApiError(status, code, "서버 원문"));
    render(<ForcedAddDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await pickExistingStudent();
    fireEvent.click(screen.getByRole("button", { name: "주소 후보 고르기" }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "확정하고 추가" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText("서버 원문")).not.toBeInTheDocument();
  });

  // N-06 — 메모는 200자까지(서버가 넘으면 422). 입력칸에서 먼저 막는다.
  it("메모 입력칸은 200자까지만 받는다", async () => {
    render(<ForcedAddDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    expect(screen.getByLabelText(/^메모/)).toHaveAttribute("maxlength", "200");
  });

  it("신규 학생 모드로 전환하면 newStudentName 을 싣고 studentId 는 undefined 다", async () => {
    mockPostForcedAdd.mockResolvedValue({
      forcedAdditionId: "2",
      runId: "7",
      studentId: "999",
      stopId: "2",
      status: "staged",
    });
    render(<ForcedAddDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole("tab", { name: "신규 학생" }));
    fireEvent.change(screen.getByLabelText(/^학생 이름/), { target: { value: "새학생" } });
    fireEvent.click(screen.getByRole("button", { name: "주소 후보 고르기" }));

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    fireEvent.click(screen.getByRole("button", { name: "확정하고 추가" }));

    await waitFor(() =>
      expect(mockPostForcedAdd).toHaveBeenCalledWith("7", {
        studentId: undefined,
        newStudentName: "새학생",
        address: "서울시 정문로 1",
        note: undefined,
      }),
    );
  });

  it("주소를 입력하지 않으면 다음 버튼이 비활성 상태다", async () => {
    render(<ForcedAddDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await pickExistingStudent();

    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });

  // B1 #25 — 주소를 손으로 치지 않고 후보에서 고른다. 고르기 전에는 다음으로 갈 수 없고, 고른 주소가 화면에 보인다.
  it("주소는 후보에서 고르며, 고르기 전에는 다음이 비활성이고 고른 뒤에는 그 주소가 보인다", async () => {
    render(<ForcedAddDialog runId="7" open onClose={vi.fn()} onDone={vi.fn()} />);
    await pickExistingStudent();

    expect(screen.queryByLabelText(/승하차 주소$/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "주소 후보 고르기" }));

    expect(screen.getByText("선택한 주소: 서울시 정문로 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });
});
