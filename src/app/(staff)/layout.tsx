// 학원 관계자(A-01~17). (admin) 과 레이아웃·내비게이션을 공유하지 않는다 — 두 역할은
// 권한 범위가 완전히 다르다(`docs/frontend/IMPLEMENTATION_PLAN.md` §1).
// 사이드바 248 · 헤더 56 골격을 F3 에서 이 자리에 채운다(`§8.1`). F3-W1 이 화면 4개를
// 먼저 등재했고, F3-W2(이 라운드)가 학생·차량·매니저·노선·알림 로그·학원 설정·비상 알림·
// 운행 리포트·운행 스케줄 화면을 만들며 이어 등재했다 — F3-W2 담당 9개 전부 등재 완료.
"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthGateGuard, LogoutButton, PasswordChangeButton, TestDataResetButton, useAuthSession } from "@/features/auth";
import { ApprovalPendingProvider, useApprovalPending } from "@/features/approval";
import { EmergencyAlertProvider, EmergencyAlertStrip, useEmergencyUnackedCount } from "@/features/emergency";
import { useAttentionSignals } from "@/shared/hooks";
import { AttentionAlertToggle } from "@/shared/lib/attention/AttentionAlertToggle";
import { HeaderClock } from "@/shared/lib/format/HeaderClock";
import { confirmLeave } from "@/shared/lib/navigation/leaveGuard";
import { useBackNavigation } from "@/shared/lib/navigation/useBackNavigation";
import { RealtimeConnectionStrip } from "@/shared/ui/realtime";
import type { SideNavGroup } from "@/shared/types";
import { Button, SideNav, ToastProvider } from "@/shared/ui";
import {
  StyledStaffShell,
  StyledStaffMain,
  StyledStaffHeader,
  StyledStaffHeaderDate,
  StyledStaffHeaderAcademy,
  StyledStaffHeaderSide,
} from "./layout.styled";

// 사이드 메뉴 — 시안(`staff/dashboard`)의 묶음 · 순서 그대로. 화면을 추가·삭제하면 이 목록을 고친다.
// 묶음 제목이 없는 첫 묶음은 제목 줄 없이 맨 위에 놓인다.
const NAV_GROUPS: SideNavGroup[] = [
  { items: [{ value: "dashboard", label: "오늘 현황", icon: "layout-dashboard" }] },
  {
    title: "오늘 운행",
    items: [
      { value: "today-run", label: "운행 상세", icon: "bus" },
      { value: "emergency", label: "비상 알림", icon: "triangle-alert" },
    ],
  },
  {
    title: "처리 대기",
    items: [
      { value: "signup-approval", label: "가입 승인", icon: "user-check" },
      { value: "change-approval", label: "구간 변경 승인", icon: "route" },
    ],
  },
  {
    title: "기초 데이터",
    items: [
      { value: "student", label: "학생 관리", icon: "users" },
      { value: "bus", label: "차량 관리", icon: "bus-front" },
      { value: "manager", label: "매니저 관리", icon: "user-cog" },
    ],
  },
  {
    title: "운행 계획",
    items: [
      { value: "route", label: "고정 노선 편성", icon: "map" },
      { value: "stops", label: "승하차지", icon: "map-pin" },
      { value: "schedule", label: "운행 스케줄", icon: "calendar-clock" },
    ],
  },
  {
    title: "기록 · 설정",
    items: [
      { value: "report", label: "운행 리포트", icon: "file-text" },
      { value: "notification", label: "알림 로그", icon: "bell" },
      { value: "academy-settings", label: "학원 설정", icon: "sliders-horizontal" },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

const resolveActiveValue = (pathname: string): string => {
  const found = NAV_ITEMS.find((item) => pathname.startsWith(`/${item.value}`));
  return found?.value ?? "dashboard";
};

// SideNav 원본(kit.jsx)은 로컬 state 로 화면을 전환하는 SPA 스위치 방식이지만, 이 앱은
// Next.js 라우팅을 쓴다 — value 를 현재 경로에서 계산하고 onChange 는 router.push 로
// 바꾼다(판단 근거, 보고서 §1).
const StaffShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuthSession();
  const { canGoBack, goBack } = useBackNavigation();
  const emergencyUnackedCount = useEmergencyUnackedCount();
  const { signupCount, changeCount, isReady } = useApprovalPending();
  // 탭 제목·브라우저 알림 — 다른 탭에 있어도 비상·승인 요청을 알아채게 한다(브라우저 알림은 사용자가 켠 경우에만).
  useAttentionSignals(emergencyUnackedCount, signupCount + changeCount, isReady);

  // 사이드바 배지 — 비상은 미확인 수, 승인 두 종은 처리 대기 수. 0 이면 배지를 달지 않는다.
  const badgeCounts: Record<string, number> = {
    emergency: emergencyUnackedCount,
    "signup-approval": signupCount,
    "change-approval": changeCount,
  };

  return (
    <StyledStaffShell>
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
            <StyledStaffHeaderDate>
              <HeaderClock />
            </StyledStaffHeaderDate>
          </StyledStaffHeaderSide>
          <StyledStaffHeaderSide>
            <StyledStaffHeaderAcademy>{session?.academy?.name ?? ""}</StyledStaffHeaderAcademy>
            <AttentionAlertToggle />
            <TestDataResetButton />
            <PasswordChangeButton />
            <LogoutButton />
          </StyledStaffHeaderSide>
        </StyledStaffHeader>
        <RealtimeConnectionStrip />
        <EmergencyAlertStrip />
        {children}
      </StyledStaffMain>
    </StyledStaffShell>
  );
};

// 세션(학원 id)이 있어야 승인 대기 통지 채널을 구독할 수 있어 가드 안쪽에서 한 겹 더 감싼다.
const StaffProviders = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuthSession();
  return (
    <EmergencyAlertProvider>
      <ApprovalPendingProvider academyId={session?.academy?.id ?? ""}>
        <ToastProvider>
          <StaffShell>{children}</StaffShell>
        </ToastProvider>
      </ApprovalPendingProvider>
    </EmergencyAlertProvider>
  );
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGateGuard requiredRole="staff">
      <StaffProviders>{children}</StaffProviders>
    </AuthGateGuard>
  );
}
