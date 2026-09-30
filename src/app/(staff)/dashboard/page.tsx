// Dashboard(운행 관리, A-03·A-04, §5.3·§5.18).
import { ApprovalPendingCard } from "@/features/approval";
import { DashboardPage } from "@/features/run";

export default function StaffDashboardPage() {
  return <DashboardPage pendingSlot={<ApprovalPendingCard />} />;
}
