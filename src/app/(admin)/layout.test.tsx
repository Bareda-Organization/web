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
  PasswordChangeButton: () => null,
  TestDataResetButton: () => null,
  useAuthSession: () => ({ session: { academy: null } }),
}));
vi.mock("@/features/emergency", () => ({
  EmergencyAlertProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EmergencyAlertStrip: () => <p>비상 띠</p>,
  useEmergencyUnackedCount: () => 1,
}));
vi.mock("@/features/admin", () => ({
  AdminPendingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAdminPending: () => ({ signupCount: 11, blockedCount: 1, isReady: true }),
  getAdminEmergencies: vi.fn(),
}));
vi.mock("@/shared/lib/navigation/useBackNavigation", () => ({ useBackNavigation: () => ({ canGoBack: false, goBack: vi.fn() }) }));

// R46-WEB A#6 · B1 #15 — 메인 관리자는 비상·가입 승인·차단이 모두 무표시였다.
describe("(admin) 레이아웃 — 알림 인지", () => {
  it("사이드바 '가입 승인'·'차단 해제'·'비상 알림' 에 건수를 붙이고 탭 제목에 합계를 반영한다", () => {
    render(
      <AdminLayout>
        <p>본문</p>
      </AdminLayout>,
    );

    expect(screen.getByRole("link", { name: /가입 승인/ })).toHaveTextContent("11");
    expect(screen.getByRole("link", { name: /차단 해제/ })).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: /비상 알림/ })).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: /학원 관리/ })).not.toHaveTextContent("1");
    expect(document.title).toBe("(13) 비상 발생 · 바래다 관계자 웹"); // 비상 1 + 가입 11 + 차단 1
  });

  it("비상 알림 띠를 본문 앞에 그린다", () => {
    render(
      <AdminLayout>
        <p>본문</p>
      </AdminLayout>,
    );

    expect(screen.getByText("비상 띠").compareDocumentPosition(screen.getByText("본문")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

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

// B1 #22 — 본문으로 가려면 사이드바 메뉴를 전부 Tab 으로 지나야 했다.
describe("(admin) 레이아웃 — 본문 바로가기", () => {
  it("첫 번째로 초점을 받는 '본문 바로가기' 링크가 본문(main)을 가리킨다", () => {
    render(
      <AdminLayout>
        <p>본문</p>
      </AdminLayout>,
    );

    const skip = screen.getByRole("link", { name: "본문 바로가기" });
    expect(skip).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});
