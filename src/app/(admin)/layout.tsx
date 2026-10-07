// 메인 관리자(O-01~07). (staff) 와 레이아웃·내비게이션을 공유하지 않는다 —
// 전 학원 범위 관제라 사이드바 구성 자체가 다르다(`docs/frontend/IMPLEMENTATION_PLAN.md` §1 · §3.4).
// 라우트 그룹 진입 자체를 막는 판정(관계자가 이 경로로 못 들어오게)은 여기가 아니라
// `features/auth/lib/navigation.ts` 의 decideAuthRedirect 한 곳뿐이다 — 이 레이아웃은
// 그 판정이 끝난 뒤의 화면 골격만 맡는다(AuthGateGuard 가 그 판정을 기다리는 동안
// 렌더를 막는다).
"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthGateGuard, LogoutButton, PasswordChangeButton, TestDataResetButton, useAuthSession } from "@/features/auth";
import { AdminPendingProvider, getAdminEmergencies, useAdminPending } from "@/features/admin";
import { EmergencyAlertProvider, EmergencyAlertStrip, useEmergencyUnackedCount } from "@/features/emergency";
import type { EmergencyAlertSource } from "@/features/emergency";
import { useAttentionSignals } from "@/shared/hooks";
import { AttentionAlertToggle } from "@/shared/lib/attention/AttentionAlertToggle";
import { HeaderClock } from "@/shared/lib/format/HeaderClock";
import { adminLiveDestination } from "@/shared/lib/ws";
import { confirmLeave } from "@/shared/lib/navigation/leaveGuard";
import { useBackNavigation } from "@/shared/lib/navigation/useBackNavigation";
import type { SideNavGroup } from "@/shared/types";
import { Button, SideNav, ToastProvider } from "@/shared/ui";
import { RealtimeConnectionStrip } from "@/shared/ui/realtime";
import {
  StyledAdminShell,
  StyledAdminMain,
  StyledAdminHeader,
  StyledAdminHeaderDate,
  StyledAdminHeaderScope,
  StyledAdminHeaderSide,
} from "./layout.styled";

// 사이드바 메뉴 — 시안(`admin/dashboard`)의 묶음 · 순서 그대로. 화면을 추가·삭제하면 이 목록을 고친다. 접근 판정은 목록이 아니라 이 그룹의
// AuthGateGuard(requiredRole)가 맡으므로 새 화면 폴더는 자동으로 system_admin 만 연다.
// 맨 위 `대시보드` 는 /overview 다 — /dashboard 는 관계자 "오늘 현황" 주소라 같은 주소를 쓰면 두 라우트 그룹이 충돌한다(Ruling 800).
const NAV_GROUPS: SideNavGroup[] = [
  { items: [{ value: "overview", label: "대시보드", icon: "layout-dashboard" }] },
  {
    title: "처리 대기",
    items: [
      { value: "member-approvals", label: "관계자 가입 승인", icon: "user-check" },
      { value: "blocked-accounts", label: "차단 해제", icon: "lock" },
    ],
  },
  {
    title: "운행 관제",
    items: [
      { value: "monitoring", label: "전체 관제", icon: "radar" },
      { value: "emergency-alerts", label: "비상 알림", icon: "triangle-alert" },
      { value: "stale-runs", label: "끝나지 않은 회차", icon: "hourglass" },
      { value: "force-confirm", label: "회차 강제 확정", icon: "circle-check" },
    ],
  },
  {
    title: "학원 · 계정",
    items: [
      { value: "academies", label: "학원 관리", icon: "building-2" },
      { value: "member-accounts", label: "계정 관리", icon: "users" },
    ],
  },
  { title: "기록", items: [{ value: "audit-log", label: "감사 · 접속 이력", icon: "history" }] },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

const resolveActiveValue = (pathname: string): string => {
  const found = NAV_ITEMS.find((item) => pathname.startsWith(`/${item.value}`));
  return found?.value ?? "overview";
};

// 메인 관리자는 학원 경계를 넘는 유일한 역할이라 session.academy 가 null 이다 — SideNav 의
// academy prop 에 학원 이름 대신 "전체 학원" 을 고정으로 넣는다(BRIEF-a1.md §2.2).
const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const emergencyUnackedCount = useEmergencyUnackedCount();
  const { signupCount, blockedCount, isReady } = useAdminPending();
  // 탭 제목·브라우저 알림 — 다른 탭에 있어도 비상·승인 대기를 알아채게 한다(브라우저 알림은 사용자가 켠 경우에만).
  useAttentionSignals(emergencyUnackedCount, signupCount + blockedCount, isReady);
  const badgeCounts: Record<string, number> = {
    "member-approvals": signupCount,
    "blocked-accounts": blockedCount,
    "emergency-alerts": emergencyUnackedCount,
  };

  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuthSession();
  const { canGoBack, goBack } = useBackNavigation();

  return (
    <StyledAdminShell>
      <SideNav
        groups={NAV_GROUPS.map((group) => ({
          ...group,
          items: group.items.map((item) => ({ ...item, badge: badgeCounts[item.value] > 0 ? badgeCounts[item.value] : undefined })),
        }))}
        value={resolveActiveValue(pathname)}
        getHref={(value) => `/${value}`}
        onChange={(value) => {
          if (confirmLeave()) router.push(`/${value}`);
        }}
        academy="전체 학원"
      />
      <StyledAdminMain>
        <StyledAdminHeader>
          <StyledAdminHeaderSide>
            {canGoBack ? (
              <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => confirmLeave() && goBack()}>
                뒤로
              </Button>
            ) : null}
            <StyledAdminHeaderDate>
              <HeaderClock />
            </StyledAdminHeaderDate>
          </StyledAdminHeaderSide>
          <StyledAdminHeaderSide>
            <StyledAdminHeaderScope>{session?.accountId ? "메인 관리자" : ""}</StyledAdminHeaderScope>
            <AttentionAlertToggle />
            <TestDataResetButton />
            <PasswordChangeButton />
            <LogoutButton />
          </StyledAdminHeaderSide>
        </StyledAdminHeader>
        {/* 전체 관제는 미확인 비상을 학원별 안내와 실시간 배너로 이미 보여 준다 — 띠까지 얹으면 같은 신고가 두 번 보이고 본문이 밀린다. */}
        <RealtimeConnectionStrip />
        {pathname.startsWith("/monitoring") ? null : <EmergencyAlertStrip />}
        {children}
      </StyledAdminMain>
    </StyledAdminShell>
  );
};

// 메인 관리자의 비상 알림 출처 — 관계자가 아직 확인하지 않은 전 학원의 신고. 확인(ack)은 관계자 몫이라 버튼이 없다.
const ADMIN_EMERGENCY_SOURCE: EmergencyAlertSource = {
  destination: adminLiveDestination(),
  fetchUnacked: async () =>
    (await getAdminEmergencies("open")).items.map((item) => ({
      emergencyId: item.emergencyId,
      busNo: item.busNo,
      type: item.type,
      raisedByName: item.raisedBy.name,
    })),
  listPath: "/emergency-alerts",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGateGuard requiredRole="system_admin">
      <EmergencyAlertProvider source={ADMIN_EMERGENCY_SOURCE}>
        <AdminPendingProvider>
          <ToastProvider>
            <AdminShell>{children}</AdminShell>
          </ToastProvider>
        </AdminPendingProvider>
      </EmergencyAlertProvider>
    </AuthGateGuard>
  );
}
