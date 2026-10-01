import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createStableRouter } from "@/shared/testing/stableRouter";
import StaffLayout from "./layout";

const mockRouter = createStableRouter();
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => mockRouter,
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
  useAuthSession: () => ({ session: { academy: { id: "7", name: "바래다" } } }),
}));
vi.mock("@/shared/lib/navigation/useBackNavigation", () => ({ useBackNavigation: () => ({ canGoBack: false, goBack: vi.fn() }) }));
vi.mock("@/features/emergency", () => ({
  EmergencyAlertProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EmergencyAlertStrip: () => <p>비상 띠</p>,
  useEmergencyUnackedCount: () => 3,
}));
vi.mock("@/features/approval", () => ({
  ApprovalPendingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useApprovalPending: () => ({ signupCount: 2, changeCount: 1, nextDeadlineAt: null, isReady: true, refresh: async () => true }),
}));

// R32-W5 — 사이드바 '비상 알림' 옆에 확인하지 않은 건수가 보여야 한다.
describe("(staff) 레이아웃 — 비상 알림 건수", () => {
  it("사이드바 '비상 알림' 에만 미확인 건수를 붙인다", () => {
    render(
      <StaffLayout>
        <p>본문</p>
      </StaffLayout>,
    );

    expect(screen.getByRole("link", { name: /비상 알림/ })).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: /운행 관리/ })).not.toHaveTextContent("3");
  });
});

// R46-WEB B — 승인 대기를 놓치면 구간 변경이 자동 거절되어 학부모에게 실패 통지가 나간다. 어느 화면에서든 건수가 보여야 한다.
describe("(staff) 레이아웃 — 승인 대기 건수", () => {
  it("사이드바 '가입 승인'·'구간 변경 승인' 에 대기 건수를 붙이고 탭 제목에도 합계를 반영한다", () => {
    render(
      <StaffLayout>
        <p>본문</p>
      </StaffLayout>,
    );

    expect(screen.getByRole("link", { name: /가입 승인/ })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /구간 변경 승인/ })).toHaveTextContent("1");
    expect(document.title).toBe("(6) 비상 발생 · 바래다 관계자 웹"); // 비상 3 + 승인 3
  });

  it("비상 알림 띠를 머리줄 아래 본문 앞에 그린다", () => {
    render(
      <StaffLayout>
        <p>본문</p>
      </StaffLayout>,
    );

    const strip = screen.getByText("비상 띠");
    const body = screen.getByText("본문");
    expect(strip.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// F03-12 — 접근 판정은 경로 목록이 아니라 라우트 그룹이 맡는다. (staff) 그룹은 staff 역할을 요구한다.
describe("(staff) 레이아웃 — 그룹 역할", () => {
  it("가드에 staff 역할을 요구한다", () => {
    render(
      <StaffLayout>
        <p>본문</p>
      </StaffLayout>,
    );

    expect(screen.getByTestId("guard")).toHaveAttribute("data-required-role", "staff");
  });
});

// B1 #22 — 본문으로 가려면 사이드바 메뉴를 전부 Tab 으로 지나야 했다.
describe("(staff) 레이아웃 — 본문 바로가기", () => {
  it("첫 번째로 초점을 받는 '본문 바로가기' 링크가 본문(main)을 가리킨다", () => {
    render(
      <StaffLayout>
        <p>본문</p>
      </StaffLayout>,
    );

    const skip = screen.getByRole("link", { name: "본문 바로가기" });
    expect(skip).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});
