// admin 기능의 공개 창구. 밖에서는 이 파일만 import 한다 (`frontend/CONVENTIONS.md` "디렉터리").
// 8화면(§6.1~§6.14) 각각의 최상위 페이지 컴포넌트만 여기서 연다 — 다이얼로그·styled 는
// 화면 내부 구현이라 밖에서 직접 쓸 일이 없다.
export { AcademiesPage } from "./components/AcademiesPage";
export { MemberApprovalsPage } from "./components/MemberApprovalsPage";
export { MemberAccountsPage } from "./components/MemberAccountsPage";
export { MonitoringPage } from "./components/MonitoringPage";
export { BlockedAccountsPage } from "./components/BlockedAccountsPage";
export { EmergencyAlertsPage } from "./components/EmergencyAlertsPage";
export { ForceConfirmPage } from "./components/ForceConfirmPage";
export { AuditLogPage } from "./components/AuditLogPage";
