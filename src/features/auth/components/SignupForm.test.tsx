import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/http";
import { SignupForm } from "./SignupForm";
import { searchAcademies, signup } from "../api";
import { useAuthSession } from "../hooks/useAuthSession";

const mockRouter = { replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
vi.mock("../api", () => ({ searchAcademies: vi.fn(), signup: vi.fn() }));
vi.mock("../hooks/useAuthSession", () => ({ useAuthSession: vi.fn() }));

const mockSearch = vi.mocked(searchAcademies);
const mockSignup = vi.mocked(signup);
const mockLogin = vi.fn();

const academy = (id: number) => ({ id: String(id), name: `학원${id}`, region: "서울", code: `A${id}` });

const setup = () => {
  vi.mocked(useAuthSession).mockReturnValue({
    bootstrapStatus: "ready",
    session: null,
    login: mockLogin,
    logout: vi.fn(),
    refreshSession: vi.fn(),
  });
  return render(<SignupForm />);
};

const fillAccount = (overrides: Partial<Record<"이름" | "연락처" | "아이디" | "비밀번호", string>> = {}) => {
  const values = { 이름: "김관계", 연락처: "010-1111-2222", 아이디: "staffnew", 비밀번호: "password1", ...overrides };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });
  }
};

const pickAcademy = async () => {
  mockSearch.mockResolvedValue([academy(1)]);
  fireEvent.change(screen.getByPlaceholderText("학원명 또는 학원 코드로 검색"), { target: { value: "학원" } });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  fireEvent.click(await screen.findByRole("button", { name: /학원1/ }));
};

describe("SignupForm", () => {
  afterEach(() => vi.clearAllMocks());

  // F03-01 — 학원 검색이 가입 제출과 섞이면 안 된다.
  it("학원 검색은 form 을 중첩하지 않고, 검색 Enter 가 가입 신청을 보내지 않는다", async () => {
    const { container } = setup();
    expect(container.querySelectorAll("form form")).toHaveLength(0);

    mockSearch.mockResolvedValue([academy(1)]);
    const search = screen.getByPlaceholderText("학원명 또는 학원 코드로 검색");
    fireEvent.change(search, { target: { value: "학원" } });
    fireEvent.keyDown(search, { key: "Enter" });
    await screen.findByRole("button", { name: /학원1/ });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  // F03-03 ① — 검색이 실패하면 아무 변화가 없던 것을 오류로 알린다.
  it("학원 검색이 실패하면 오류 문구를 보여준다", async () => {
    setup();
    mockSearch.mockRejectedValue(new ApiError(500, "UNKNOWN", "서버 오류"));
    fireEvent.change(screen.getByPlaceholderText("학원명 또는 학원 코드로 검색"), { target: { value: "학원" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(await screen.findByText("학원 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.")).toBeInTheDocument();
    expect(screen.queryByText("검색 결과가 없습니다")).not.toBeInTheDocument();
  });

  // F03-03 ② — 서버는 20건까지만 준다(§2.1). 20건이면 잘렸을 수 있다.
  it("검색 결과가 20건이면 검색어를 좁혀 달라고 안내한다", async () => {
    setup();
    mockSearch.mockResolvedValue(Array.from({ length: 20 }, (_, index) => academy(index + 1)));
    fireEvent.change(screen.getByPlaceholderText("학원명 또는 학원 코드로 검색"), { target: { value: "학" } });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));

    expect(await screen.findByText(/검색어를 더 좁혀/)).toBeInTheDocument();
  });

  // F03-14 — 마우스 없이도 고를 수 있어야 한다.
  it("학원 결과 행은 버튼이라 키보드로 고를 수 있고, 고른 행에 선택 표시가 붙는다", async () => {
    setup();
    await pickAcademy();

    expect(screen.getByRole("button", { name: /학원1/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/선택한 학원 — 학원1/)).toBeInTheDocument();
  });

  // F03-15 ① — 서버 422 를 받기 전에 막는다.
  it.each([
    ["비밀번호가 한글 25자(75바이트)", { 비밀번호: "가".repeat(25) }, "비밀번호는 한글 24자(영문·숫자 72자) 이하로 입력해 주세요."],
    ["아이디 51자", { 아이디: "a".repeat(51) }, "아이디는 50자 이하로 입력해 주세요."],
    ["이름이 공백뿐", { 이름: "   " }, "이름과 연락처를 입력해 주세요."],
  ])("%s 이면 가입 요청을 보내지 않고 이유를 알린다", async (_name, overrides, message) => {
    setup();
    fillAccount(overrides);
    await pickAcademy();
    fireEvent.click(screen.getByRole("button", { name: "가입 신청" }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  // F03-15 ② — 가입은 됐는데 뒤이은 로그인이 실패하면 "가입 실패" 로 안내하면 다시 제출해 DUPLICATE_LOGIN_ID 를 맞는다.
  it("가입은 성공했는데 로그인만 실패하면 가입 실패가 아니라 로그인 안내를 보이고 다시 제출하지 못하게 한다", async () => {
    setup();
    mockSignup.mockResolvedValue({ accountStatus: "pending", requestedAt: "t", approver: "staff" });
    mockLogin.mockRejectedValue(new ApiError(503, "UNKNOWN", "점검 중"));
    fillAccount();
    await pickAcademy();
    fireEvent.click(screen.getByRole("button", { name: "가입 신청" }));

    expect(await screen.findByText("가입 신청은 접수됐습니다")).toBeInTheDocument();
    expect(screen.queryByText(/가입에 실패했습니다/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "가입 신청" })).toBeDisabled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
