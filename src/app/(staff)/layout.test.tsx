import { render, screen, within } from "@testing-library/react";
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
vi.mock("@/shared/ui/realtime", () => ({ RealtimeConnectionStrip: () => <p>연결 띠</p> }));
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
    expect(screen.getByRole("link", { name: /오늘 현황/ })).not.toHaveTextContent("3");
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
// R46-FIXCONN C-12 — 비상·승인 화면처럼 연결 상태를 안 읽던 화면에서도 끊김이 보이도록 연결 띠를 레이아웃에 한 번만 둔다.
describe("(staff) 레이아웃 — 실시간 연결 띠", () => {
  it("연결 띠를 머리줄 아래 · 비상 알림 띠와 본문 앞에 그린다", () => {
    render(
      <StaffLayout>
        <p>본문</p>
      </StaffLayout>,
    );

    const connection = screen.getByText("연결 띠");
    expect(connection.compareDocumentPosition(screen.getByText("비상 띠")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(connection.compareDocumentPosition(screen.getByText("본문")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

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

// R48 G3 — 학원 관계자 사이드 메뉴는 시안(staff/dashboard)과 같은 묶음 · 순서다.
// 기대값은 지시서의 메뉴 표에서 그대로 옮겼다(배지는 위 mock 의 건수: 비상 3 · 가입 승인 2 · 구간 변경 승인 1).
describe("(staff) 레이아웃 — 사이드 메뉴 묶음", () => {
  const renderLayout = () =>
    render(
      <StaffLayout>
        <p>본문</p>
      </StaffLayout>,
    );

  it("제목 없는 첫 묶음(오늘 현황) 뒤에 5개 묶음이 시안 순서로 이어진다", () => {
    renderLayout();

    const nav = screen.getByRole("navigation", { name: "주 메뉴" });
    const groups = within(nav).getAllByRole("group");
    expect(groups.map((group) => document.getElementById(group.getAttribute("aria-labelledby") as string)?.textContent)).toEqual([
      "오늘 운행",
      "처리 대기",
      "기초 데이터",
      "운행 계획",
      "기록 · 설정",
    ]);
    expect(within(nav).getAllByRole("link")[0]).toHaveAttribute("href", "/dashboard");
    expect(within(nav).getAllByRole("link")[0]).toHaveAccessibleName("오늘 현황");
  });

  it("묶음마다 항목 이름 · 배지 · 주소가 시안 순서와 같다", () => {
    renderLayout();

    const itemsOf = (groupName: string) =>
      within(screen.getByRole("group", { name: groupName }))
        .getAllByRole("link")
        .map((link) => [link.getAttribute("aria-label") ?? link.textContent, link.getAttribute("href")]);

    expect(itemsOf("오늘 운행")).toEqual([
      ["운행 상세", "/today-run"],
      ["비상 알림 3건", "/emergency"],
    ]);
    expect(itemsOf("처리 대기")).toEqual([
      ["가입 승인 2건", "/signup-approval"],
      ["구간 변경 승인 1건", "/change-approval"],
    ]);
    expect(itemsOf("기초 데이터")).toEqual([
      ["학생 관리", "/student"],
      ["차량 관리", "/bus"],
      ["매니저 관리", "/manager"],
    ]);
    expect(itemsOf("운행 계획")).toEqual([
      ["고정 노선 편성", "/route"],
      ["운행 스케줄", "/schedule"],
    ]);
    expect(itemsOf("기록 · 설정")).toEqual([
      ["운행 리포트", "/report"],
      ["알림 로그", "/notification"],
      ["학원 설정", "/academy-settings"],
    ]);
  });

  it("머리줄에 날짜·시각, 학원 이름, '브라우저 알림 꺼짐 · 켜기'가 있다", () => {
    renderLayout();

    const header = screen.getByRole("banner");
    expect(within(header).getByText(/^\d+월 \d+일 \([일월화수목금토]\) \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(within(header).getByText("바래다")).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "브라우저 알림 꺼짐 · 켜기" })).toBeInTheDocument();
  });
});
