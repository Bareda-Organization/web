import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStableRouter } from "@/shared/testing/stableRouter";
import AdminLayout from "./layout";

const mockRouter = createStableRouter();
let mockPathname = "/academies";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
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
  useAuthSession: () => ({ session: { accountId: "1", academy: null } }),
}));
vi.mock("@/features/emergency", () => ({
  EmergencyAlertProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  EmergencyAlertStrip: () => <p>비상 띠</p>,
  useEmergencyUnackedCount: () => 1,
}));
vi.mock("@/shared/ui/realtime", () => ({ RealtimeConnectionStrip: () => <p>연결 띠</p> }));
const mockPending = { signupCount: 11, blockedCount: 1, isReady: true };
vi.mock("@/features/admin", () => ({
  AdminPendingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAdminPending: () => mockPending,
  getAdminEmergencies: vi.fn(),
}));
const { mockNotify } = vi.hoisted(() => ({ mockNotify: vi.fn() }));
vi.mock("@/shared/lib/attention/attentionAlert", async (importOriginal) => ({ ...(await importOriginal<object>()), notifyAttention: mockNotify }));
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
    expect(document.title).toBe("(13) 비상 발생 · 바래다 메인 관리자 콘솔"); // 비상 1 + 가입 11 + 차단 1 — 콘솔 이름은 PRD §12.4
  });

  // Ruling 847 — 차단 계정이 늘어도 "승인 요청 N건" 알림이 나가던 것. 늘어난 종류를 그대로 말한다.
  describe("브라우저 알림 문구", () => {
    afterEach(() => {
      mockPending.signupCount = 11;
      mockPending.blockedCount = 1;
      mockNotify.mockClear();
    });

    it("차단 계정만 늘면 차단 계정이라고 알리고 '승인' 이라 부르지 않는다", () => {
      const { rerender } = render(
        <AdminLayout>
          <p>본문</p>
        </AdminLayout>,
      );
      mockPending.blockedCount = 2;
      rerender(
        <AdminLayout>
          <p>본문</p>
        </AdminLayout>,
      );

      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(mockNotify.mock.calls[0]?.[0]).toBe("차단 계정");
      expect(JSON.stringify(mockNotify.mock.calls)).not.toContain("승인");
    });

    it("관계자 가입 승인 요청이 늘면 가입 승인이라고 알린다", () => {
      const { rerender } = render(
        <AdminLayout>
          <p>본문</p>
        </AdminLayout>,
      );
      mockPending.signupCount = 12;
      rerender(
        <AdminLayout>
          <p>본문</p>
        </AdminLayout>,
      );

      expect(mockNotify.mock.calls[0]?.[0]).toBe("관계자 가입 승인");
    });
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

// Ruling 844 — "본문 바로가기" 링크는 사양 근거가 없어 뺐다.
describe("(admin) 레이아웃 — 본문 바로가기 없음", () => {
  it("'본문 바로가기' 링크를 그리지 않고 본문(main)은 그대로 있다", () => {
    render(
      <AdminLayout>
        <p>본문</p>
      </AdminLayout>,
    );

    expect(screen.queryByRole("link", { name: "본문 바로가기" })).not.toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("본문");
  });
});

// R46-FUWEB — 전체 관제 화면은 미확인 비상을 학원별 안내와 실시간 배너로 이미 보여 준다. 레이아웃 띠까지 얹으면 같은 신고가 두 번 보인다.
describe("(admin) 레이아웃 — 전체 관제의 비상 표시", () => {
  afterEach(() => {
    mockPathname = "/academies";
  });

  it("전체 관제 화면에서는 비상 알림 띠를 그리지 않고, 사이드바 건수·탭 제목은 그대로다", () => {
    mockPathname = "/monitoring";
    render(
      <AdminLayout>
        <p>본문</p>
      </AdminLayout>,
    );

    expect(screen.queryByText("비상 띠")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /비상 알림/ })).toHaveTextContent("1");
    expect(document.title).toBe("(13) 비상 발생 · 바래다 메인 관리자 콘솔");
  });

  // R46-FIXCONN C-12 — 전체 관제를 포함한 모든 관리자 화면에서 끊김이 보이게 연결 띠를 레이아웃에 한 번만 둔다.
  it("연결 띠를 본문 앞에 그리고, 전체 관제 화면에서도 그린다", () => {
    mockPathname = "/monitoring";
    render(
      <AdminLayout>
        <p>본문</p>
      </AdminLayout>,
    );

    const connection = screen.getByText("연결 띠");
    expect(connection.compareDocumentPosition(screen.getByText("본문")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    mockPathname = "/academies";
  });
});

// R48 G3 — 메인 관리자 사이드 메뉴는 시안(admin/dashboard)과 같은 묶음 · 순서다.
// 기대값은 지시서의 메뉴 표에서 그대로 옮겼다(배지는 위 mock 의 건수: 가입 승인 11 · 차단 1 · 비상 1).
describe("(admin) 레이아웃 — 사이드 메뉴 묶음", () => {
  const renderLayout = () =>
    render(
      <AdminLayout>
        <p>본문</p>
      </AdminLayout>,
    );

  it("제목 없는 첫 묶음(대시보드) 뒤에 4개 묶음이 시안 순서로 이어진다", () => {
    renderLayout();

    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    const groups = within(nav).getAllByRole("group");
    expect(groups.map((group) => group.getAttribute("aria-labelledby") && document.getElementById(group.getAttribute("aria-labelledby") as string)?.textContent)).toEqual([
      "처리 대기",
      "운행 관제",
      "학원 · 계정",
      "기록",
    ]);
    // R48 Ruling 800 — 관계자 "오늘 현황"이 /dashboard 라서 메인 관리자 대시보드는 /overview 다.
    expect(within(nav).getAllByRole("link")[0]).toHaveAttribute("href", "/overview");
    expect(within(nav).getAllByRole("link")[0]).toHaveAccessibleName("대시보드");
  });

  it("대시보드 항목은 /overview 에서 켜지고, 메뉴에 없는 주소의 기본 켜짐도 대시보드다", () => {
    mockPathname = "/overview";
    const { unmount } = renderLayout();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("aria-current", "page");
    unmount();

    mockPathname = "/somewhere-new";
    renderLayout();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("aria-current", "page");
    mockPathname = "/academies";
  });

  it("묶음마다 항목 이름 · 배지 · 주소가 시안 순서와 같다", () => {
    renderLayout();

    const itemsOf = (groupName: string) =>
      within(screen.getByRole("group", { name: groupName }))
        .getAllByRole("link")
        .map((link) => [link.getAttribute("aria-label") ?? link.textContent, link.getAttribute("href")]);

    expect(itemsOf("처리 대기")).toEqual([
      ["관계자 가입 승인 11건", "/member-approvals"],
      ["차단 해제 1건", "/blocked-accounts"],
    ]);
    expect(itemsOf("운행 관제")).toEqual([
      ["전체 관제", "/monitoring"],
      ["비상 알림 1건", "/emergency-alerts"],
      ["끝나지 않은 회차", "/stale-runs"],
      ["회차 강제 확정", "/force-confirm"],
    ]);
    expect(itemsOf("학원 · 계정")).toEqual([
      ["학원 관리", "/academies"],
      ["계정 관리", "/member-accounts"],
    ]);
    expect(itemsOf("기록")).toEqual([["감사 · 접속 이력", "/audit-log"]]);
  });

  it("머리줄에 날짜·시각, 역할, '브라우저 알림 꺼짐 · 켜기'가 있다", () => {
    renderLayout();

    const header = screen.getByRole("banner");
    expect(within(header).getByText(/^\d+월 \d+일 \([일월화수목금토]\) \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(within(header).getByText("메인 관리자")).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "브라우저 알림 꺼짐 · 켜기" })).toBeInTheDocument();
  });
});
