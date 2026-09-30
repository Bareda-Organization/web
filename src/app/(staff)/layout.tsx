// 학원 관계자(A-01~17). (admin) 과 레이아웃·내비게이션을 공유하지 않는다 — 두 역할은
// 권한 범위가 완전히 다르다(`docs/frontend/IMPLEMENTATION_PLAN.md` §1).
// 사이드바 248 · 헤더 56 골격을 F3 에서 이 자리에 채운다(`§8.1`). F3-W1 이 화면 4개를
// 먼저 등재했고, F3-W2(이 라운드)가 학생·차량·매니저·노선·알림 로그·학원 설정·비상 알림·
// 운행 리포트·운행 스케줄 화면을 만들며 이어 등재했다 — F3-W2 담당 9개 전부 등재 완료.
"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthGateGuard, LogoutButton, TestDataResetButton, useAuthSession } from "@/features/auth";
import { EmergencyAlertProvider, useEmergencyUnackedCount } from "@/features/emergency";
import { confirmLeave } from "@/shared/lib/navigation/leaveGuard";
import { useBackNavigation } from "@/shared/lib/navigation/useBackNavigation";
import { Button, SideNav } from "@/shared/ui";
import {
  StyledStaffShell,
  StyledStaffMain,
  StyledStaffHeader,
  StyledStaffHeaderDate,
  StyledStaffHeaderAcademy,
  StyledStaffHeaderSide,
} from "./layout.styled";

const NAV_ITEMS = [
  { value: "dashboard", label: "운행 관리", icon: "layout-dashboard" },
  { value: "today-run", label: "금일 운행 상세", icon: "bus" },
  { value: "signup-approval", label: "가입 승인", icon: "user-check" },
  { value: "change-approval", label: "구간 변경 승인", icon: "route" },
  { value: "student", label: "학생 관리", icon: "users" },
  { value: "bus", label: "차량 관리", icon: "bus-front" },
  { value: "manager", label: "매니저 관리", icon: "user-cog" },
  { value: "route", label: "고정 노선 편성", icon: "map" },
  { value: "schedule", label: "운행 스케줄", icon: "calendar-clock" },
  { value: "notification", label: "알림 로그", icon: "bell" },
  { value: "academy-settings", label: "학원 설정", icon: "settings" },
  { value: "emergency", label: "비상 알림", icon: "siren" },
  { value: "report", label: "운행 리포트", icon: "file-text" },
] as const;

const resolveActiveValue = (pathname: string): string => {
  const found = NAV_ITEMS.find((item) => pathname.startsWith(`/${item.value}`));
  return found?.value ?? "dashboard";
};

const formatToday = (): string =>
  new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

// SideNav 원본(kit.jsx)은 로컬 state 로 화면을 전환하는 SPA 스위치 방식이지만, 이 앱은
// Next.js 라우팅을 쓴다 — value 를 현재 경로에서 계산하고 onChange 는 router.push 로
// 바꾼다(판단 근거, 보고서 §1).
const StaffShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuthSession();
  const { canGoBack, goBack } = useBackNavigation();
  const emergencyUnackedCount = useEmergencyUnackedCount();

  return (
    <StyledStaffShell>
      <SideNav
        items={NAV_ITEMS.map((item) => ({
          value: item.value,
          label: item.label,
          icon: item.icon,
          badge: item.value === "emergency" && emergencyUnackedCount > 0 ? emergencyUnackedCount : undefined,
        }))}
        value={resolveActiveValue(pathname)}
        onChange={(value) => {
          if (confirmLeave()) router.push(`/${value}`);
        }}
        academy={session?.academy?.name}
      />
      <StyledStaffMain>
        <StyledStaffHeader>
          <StyledStaffHeaderSide>
            {canGoBack ? (
              <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => confirmLeave() && goBack()}>
                뒤로
              </Button>
            ) : null}
            <StyledStaffHeaderDate>{formatToday()}</StyledStaffHeaderDate>
          </StyledStaffHeaderSide>
          <StyledStaffHeaderSide>
            <StyledStaffHeaderAcademy>{session?.academy?.name ?? ""}</StyledStaffHeaderAcademy>
            <TestDataResetButton />
            <LogoutButton />
          </StyledStaffHeaderSide>
        </StyledStaffHeader>
        {children}
      </StyledStaffMain>
    </StyledStaffShell>
  );
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGateGuard requiredRole="staff">
      <EmergencyAlertProvider>
        <StaffShell>{children}</StaffShell>
      </EmergencyAlertProvider>
    </AuthGateGuard>
  );
}
