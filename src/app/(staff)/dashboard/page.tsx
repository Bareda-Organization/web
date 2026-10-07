"use client";

// Dashboard(오늘 현황, A-03·A-14, §5.3·§5.18). 승인 대기 건수는 레이아웃의 제공자가 세고, 이 페이지가 `run` 화면으로 넘겨 준다
// (`run` 이 `approval` 을 직접 읽지 않는다 — 기능 간 경계).
import { useApprovalPending } from "@/features/approval";
import { SetupChecklist } from "@/features/onboarding";
import { DashboardPage } from "@/features/run";

export default function StaffDashboardPage() {
  const { signupCount, changeCount, nextDeadlineAt, isReady } = useApprovalPending();
  return (
    <DashboardPage
      pendingSlot={<SetupChecklist />}
      approvals={{ signupCount, changeCount, nextDeadlineAt, isReady }}
    />
  );
}
