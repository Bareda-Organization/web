import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStableRouter } from "@/shared/testing/stableRouter";
import { changePassword } from "../api";
import { AuthGateGuard } from "./AuthGateGuard";

const mockLogout = vi.fn().mockResolvedValue(undefined);
let mockSession: Record<string, unknown> | null = null;

const mockRouter = createStableRouter();
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => mockRouter }));
vi.mock("../api", () => ({ changePassword: vi.fn() }));
vi.mock("../hooks/useAuthSession", () => ({
  useAuthSession: () => ({ bootstrapStatus: "ready", session: mockSession, logout: mockLogout }),
}));

const mockChange = vi.mocked(changePassword);
const STAFF = { accountId: "2", role: "staff", status: "active", academy: { id: "1", name: "A학원" } };

// Ruling 540 — 관리자가 초기화한 임시 비밀번호로 들어온 계정은 비밀번호를 바꾸기 전까지 화면을 쓰지 못한다.
describe("AuthGateGuard — 임시 비밀번호 강제 변경", () => {
  afterEach(() => {
    mockSession = null;
    vi.clearAllMocks();
  });

  it("표식이 켜진 세션은 본문 대신 취소할 수 없는 비밀번호 변경 대화상자를 본다", () => {
    mockSession = { ...STAFF, mustChangePassword: true };

    render(
      <AuthGateGuard requiredRole="staff">
        <p>대시보드 본문</p>
      </AuthGateGuard>,
    );

    expect(screen.queryByText("대시보드 본문")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "비밀번호 변경" })).toBeInTheDocument();
    expect(screen.getByText(/관리자가 초기화한 임시 비밀번호/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "취소" })).not.toBeInTheDocument();
  });

  it("표식이 없는 세션은 본문을 그대로 본다", () => {
    mockSession = { ...STAFF, mustChangePassword: false };

    render(
      <AuthGateGuard requiredRole="staff">
        <p>대시보드 본문</p>
      </AuthGateGuard>,
    );

    expect(screen.getByText("대시보드 본문")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("강제 변경에 성공하면 [다시 로그인] 에서 로그아웃한다 — 서버가 refresh 토큰을 전부 끊었기 때문이다", async () => {
    mockSession = { ...STAFF, mustChangePassword: true };
    mockChange.mockResolvedValue(undefined);
    render(
      <AuthGateGuard requiredRole="staff">
        <p>대시보드 본문</p>
      </AuthGateGuard>,
    );

    fireEvent.change(screen.getByLabelText(/현재 비밀번호/), { target: { value: "temp-pass" } });
    fireEvent.change(screen.getByLabelText(/^새 비밀번호 \*/), { target: { value: "new-pass-1" } });
    fireEvent.change(screen.getByLabelText(/새 비밀번호 확인/), { target: { value: "new-pass-1" } });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => expect(mockChange).toHaveBeenCalledWith({ currentPassword: "temp-pass", newPassword: "new-pass-1" }));
    fireEvent.click(await screen.findByRole("button", { name: "다시 로그인" }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
