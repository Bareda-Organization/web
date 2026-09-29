import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StaffLayout from "./layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/features/auth", () => ({
  AuthGateGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LogoutButton: () => null,
  TestDataResetButton: () => null,
  useAuthSession: () => ({ session: { academy: { id: "7", name: "바래다" } } }),
}));
vi.mock("@/shared/lib/navigation/useBackNavigation", () => ({ useBackNavigation: () => ({ canGoBack: false, goBack: vi.fn() }) }));
vi.mock("@/features/emergency", () => ({
  EmergencyAlertProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useEmergencyUnackedCount: () => 3,
}));

// R32-W5 — 사이드바 '비상 알림' 옆에 확인하지 않은 건수가 보여야 한다.
describe("(staff) 레이아웃 — 비상 알림 건수", () => {
  it("사이드바 '비상 알림' 에만 미확인 건수를 붙인다", () => {
    render(
      <StaffLayout>
        <p>본문</p>
      </StaffLayout>,
    );

    expect(screen.getByRole("button", { name: /비상 알림/ })).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: /운행 관리/ })).not.toHaveTextContent("3");
  });
});
