import type { AuthSession } from "../types";

// `(admin)` 아래 최상위 경로 전부 — 라우트 그룹 괄호는 실제 URL 에 안 붙으므로
// 여기 나열하지 않은 admin 화면은 이 함수가 관계자(staff) 접근을 못 걸러낸다.
// 화면을 추가할 때마다 이 목록에도 반드시 추가한다 (BRIEF-a1.md §2 — "관계자가
// 주소를 직접 쳐서 들어가는 경우가 가장 위험한 자리").
const ADMIN_PATH_SEGMENTS = [
  "/academies",
  "/member-approvals",
  "/member-accounts",
  "/monitoring",
  "/blocked-accounts",
  "/emergency-alerts",
  "/force-confirm",
  "/audit-log",
] as const;

// 문자열 시작 일치만 쓰면 "/academies-fake" 같은 값이 오탐으로 걸린다 —
// 정확히 같거나 그 경로 + "/" 로 시작할 때만 그 그룹에 속한다고 본다.
const matchesPath = (pathname: string, segment: string): boolean =>
  pathname === segment || pathname.startsWith(`${segment}/`);

// 계정 상태·역할로 화면 진입이 갈리는 판정을 한곳에 모은다 — BRIEF-web §3
// "판정은 한 곳에서 한다. 화면은 그 결과만 받는다"를 만족하려는 자리다.
// (auth)·(staff)·(admin) 세 레이아웃이 전부 이 함수 하나만 부른다.
//
// 반환값이 있으면 그 경로로 옮겨야 한다는 뜻이고, null 이면 지금 경로를 그대로 보여준다.
export const decideAuthRedirect = (session: AuthSession | null, pathname: string): string | null => {
  const isPublicAuthPath = pathname === "/login" || pathname === "/signup";
  const isSignupStatusPath = pathname === "/signup-status";

  if (!session) {
    // 로그인 안 됨 — 로그인·가입 화면만 그대로 두고 나머지는 로그인으로 보낸다.
    return isPublicAuthPath ? null : "/login";
  }

  if (session.status === "pending" || session.status === "rejected") {
    // §1.4 — pending·rejected 는 대기 화면에 고정된다. 대시보드로 못 간다.
    return isSignupStatusPath ? null : "/signup-status";
  }

  // status === "active" 부터는 로그인·가입·대기 화면에 남아 있을 이유가 없다.
  if (isPublicAuthPath || isSignupStatusPath) {
    return session.role === "system_admin" ? "/academies" : "/dashboard";
  }

  // 관계자 웹은 학원 관계자(staff)·메인 관리자(system_admin) 만 쓴다
  // (`IMPLEMENTATION_PLAN §1` 제품별 사용자 열) — (staff)·(admin) 은 레이아웃을
  // 공유하지 않으므로 역할이 그 그룹과 안 맞으면 자기 홈으로 되돌린다.
  const isAdminPath = ADMIN_PATH_SEGMENTS.some((segment) => matchesPath(pathname, segment));
  const isStaffPath = pathname.startsWith("/dashboard");

  if (isAdminPath && session.role !== "system_admin") {
    return session.role === "staff" ? "/dashboard" : "/login";
  }
  if (isStaffPath && session.role !== "staff") {
    return session.role === "system_admin" ? "/academies" : "/login";
  }

  return null;
};
