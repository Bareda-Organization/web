// 메인 관리자(O-01~07). (staff) 와 레이아웃·내비게이션을 공유하지 않는다 —
// 전 학원 범위 관제라 사이드바 구성 자체가 다르다(`docs/frontend/IMPLEMENTATION_PLAN.md` §1 · §3.4).
// 라우트 그룹 진입 자체를 막는 판정(관계자가 이 경로로 못 들어오게)은 여기가 아니라
// `features/auth/lib/navigation.ts` 의 decideAuthRedirect 한 곳뿐이다 — 이 레이아웃은
// 그 판정이 끝난 뒤의 화면 골격만 맡는다(AuthGateGuard 가 그 판정을 기다리는 동안
// 렌더를 막는다).
"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthGateGuard, LogoutButton, TestDataResetButton, useAuthSession } from "@/features/auth";
import { confirmLeave } from "@/shared/lib/navigation/leaveGuard";
import { useBackNavigation } from "@/shared/lib/navigation/useBackNavigation";
import { Button, SideNav } from "@/shared/ui";
import {
  StyledAdminShell,
  StyledAdminMain,
  StyledAdminHeader,
  StyledAdminHeaderDate,
  StyledAdminHeaderScope,
  StyledAdminHeaderSide,
} from "./layout.styled";

// features/auth/lib/navigation.ts 의 ADMIN_PATH_SEGMENTS 와 반드시 같은 8개를 유지한다 —
// 화면을 추가·삭제할 때 두 목록을 함께 고친다.
const NAV_ITEMS = [
  { value: "academies", label: "학원 관리", icon: "building-2" },
  { value: "member-approvals", label: "가입 승인", icon: "user-check" },
  { value: "member-accounts", label: "계정 관리", icon: "users" },
  { value: "monitoring", label: "전체 관제", icon: "radar" },
  { value: "blocked-accounts", label: "차단 해제", icon: "shield-off" },
  { value: "emergency-alerts", label: "비상 알림", icon: "siren" },
  { value: "force-confirm", label: "회차 강제 확정", icon: "gavel" },
  { value: "audit-log", label: "감사 · 접속 이력", icon: "history" },
] as const;

const resolveActiveValue = (pathname: string): string => {
  const found = NAV_ITEMS.find((item) => pathname.startsWith(`/${item.value}`));
  return found?.value ?? "academies";
};

const formatToday = (): string =>
  new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

// 메인 관리자는 학원 경계를 넘는 유일한 역할이라 session.academy 가 null 이다 — SideNav 의
// academy prop 에 학원 이름 대신 "전체 학원" 을 고정으로 넣는다(BRIEF-a1.md §2.2).
const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuthSession();
  const { canGoBack, goBack } = useBackNavigation();

  return (
    <StyledAdminShell>
      <SideNav
        items={NAV_ITEMS.map((item) => ({ value: item.value, label: item.label, icon: item.icon }))}
        value={resolveActiveValue(pathname)}
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
            <StyledAdminHeaderDate>{formatToday()}</StyledAdminHeaderDate>
          </StyledAdminHeaderSide>
          <StyledAdminHeaderSide>
            <StyledAdminHeaderScope>{session?.accountId ? "메인 관리자" : ""}</StyledAdminHeaderScope>
            <TestDataResetButton />
            <LogoutButton />
          </StyledAdminHeaderSide>
        </StyledAdminHeader>
        {children}
      </StyledAdminMain>
    </StyledAdminShell>
  );
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGateGuard>
      <AdminShell>{children}</AdminShell>
    </AuthGateGuard>
  );
}
