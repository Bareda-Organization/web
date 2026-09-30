import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminLayout from "./layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/academies",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/features/auth", () => ({
  AuthGateGuard: ({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) => (
    <div data-testid="guard" data-required-role={requiredRole}>
      {children}
    </div>
  ),
  LogoutButton: () => null,
  TestDataResetButton: () => null,
  useAuthSession: () => ({ session: { academy: null } }),
}));
vi.mock("@/shared/lib/navigation/useBackNavigation", () => ({ useBackNavigation: () => ({ canGoBack: false, goBack: vi.fn() }) }));

// F03-12 — 접근 판정은 경로 목록이 아니라 라우트 그룹이 맡는다. (admin) 그룹은 system_admin 역할을 요구한다.
describe("(admin) 레이아웃 — 그룹 역할", () => {
  it("가드에 system_admin 역할을 요구한다", () => {
    render(
      <AdminLayout>
        <p>본문</p>
      </AdminLayout>,
    );

    expect(screen.getByTestId("guard")).toHaveAttribute("data-required-role", "system_admin");
  });
});
