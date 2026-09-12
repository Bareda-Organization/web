// 학원 관계자(A-01~17). (admin) 과 레이아웃·내비게이션을 공유하지 않는다 — 두 역할은
// 권한 범위가 완전히 다르다(`frontend/IMPLEMENTATION_PLAN.md` §1).
// 사이드바 248 · 헤더 56 골격을 F3 에서 이 자리에 채운다(`§8.1`). 내비게이션 항목은
// 이번 라운드(F3-W1)가 만든 화면 4개만 등재한다 — 노선·학생·매니저·로그 화면은
// 다른 라운드 몫이라 죽은 링크를 만들지 않는다.
"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthGateGuard, useAuthSession } from "@/features/auth";
import { SideNav } from "@/shared/ui";
import {
  StyledStaffShell,
  StyledStaffMain,
  StyledStaffHeader,
  StyledStaffHeaderDate,
  StyledStaffHeaderAcademy,
} from "./layout.styled";

const NAV_ITEMS = [
  { value: "dashboard", label: "운행 관리", icon: "layout-dashboard" },
  { value: "today-run", label: "금일 운행 상세", icon: "bus" },
  { value: "signup-approval", label: "가입 승인", icon: "user-check" },
  { value: "change-approval", label: "구간 변경 승인", icon: "route" },
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

  return (
    <StyledStaffShell>
      <SideNav
        items={NAV_ITEMS.map((item) => ({ value: item.value, label: item.label, icon: item.icon }))}
        value={resolveActiveValue(pathname)}
        onChange={(value) => router.push(`/${value}`)}
        academy={session?.academy?.name}
      />
      <StyledStaffMain>
        <StyledStaffHeader>
          <StyledStaffHeaderDate>{formatToday()}</StyledStaffHeaderDate>
          <StyledStaffHeaderAcademy>{session?.academy?.name ?? ""}</StyledStaffHeaderAcademy>
        </StyledStaffHeader>
        {children}
      </StyledStaffMain>
    </StyledStaffShell>
  );
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGateGuard>
      <StaffShell>{children}</StaffShell>
    </AuthGateGuard>
  );
}
