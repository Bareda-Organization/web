// 메인 관리자 대시보드(§6.18, Ruling 800) — 로그인 뒤 첫 화면. 주소가 /dashboard 가 아닌 이유는 관계자 "오늘 현황"이 그 주소라서다.
import { DashboardPage } from "@/features/admin";

export default function AdminOverviewPage() {
  return <DashboardPage />;
}
