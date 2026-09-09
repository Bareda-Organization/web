import type { AuthSession } from "../types";

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
  const isAdminPath = pathname.startsWith("/academies");
  const isStaffPath = pathname.startsWith("/dashboard");

  if (isAdminPath && session.role !== "system_admin") {
    return session.role === "staff" ? "/dashboard" : "/login";
  }
  if (isStaffPath && session.role !== "staff") {
    return session.role === "system_admin" ? "/academies" : "/login";
  }

  return null;
};
