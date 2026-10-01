"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { decideAuthRedirect } from "../lib/navigation";
import { useAuthSession } from "../hooks/useAuthSession";
import type { AuthSession } from "../types";
import { StyledGuardFallback } from "./AuthGateGuard.styled";
import { PasswordChangeDialog } from "./PasswordChangeButton";

export type AuthGateGuardProps = {
  children: React.ReactNode;
  /** 이 라우트 그룹이 요구하는 역할 — (admin) 은 system_admin, (staff) 는 staff. 다르면 자기 홈으로 보낸다. */
  requiredRole?: AuthSession["role"];
};

// (auth)·(staff)·(admin) 레이아웃 3곳이 전부 이 컴포넌트 하나만 부른다 — 계정 상태·역할
// 판정은 `decideAuthRedirect` 한 곳에서만 하고, 화면은 그 결과(리다이렉트 여부)만 받는다
// (BRIEF-web §3). `AuthSessionProvider` 가 authGate 이벤트로 세션을 갱신하면 이 컴포넌트가
// 다시 렌더돼 같은 판정 함수로 자동 이동한다 — 화면마다 403 을 따로 잡을 필요가 없다.
//
// bootstrapStatus 가 "loading" 인 동안은 자식도, 리다이렉트도 하지 않는다 — 로그인 폼이
// 잠깐 보였다가 홈으로 튀는 결함(BRIEF-web §2)은 여기서 막는다.
export const AuthGateGuard = ({ children, requiredRole }: AuthGateGuardProps) => {
  const { bootstrapStatus, session } = useAuthSession();
  const pathname = usePathname();
  const router = useRouter();

  const target = bootstrapStatus === "ready" ? decideAuthRedirect(session, pathname, requiredRole) : null;

  useEffect(() => {
    if (target) {
      router.replace(target);
    }
  }, [target, router]);

  if (bootstrapStatus === "loading" || target) {
    // 부트스트랩 중이거나 이동 중 — 로그인 폼도 보호된 화면도 그리지 않는다.
    return <StyledGuardFallback aria-busy="true" />;
  }

  // 임시 비밀번호 강제 변경(Ruling 540) — 서버도 이 표식이 켜진 동안 다른 API 를 403 으로 막는다. 화면은 그 전에
  // 변경 대화상자만 보여 막힌 호출이 쏟아지지 않게 한다.
  if (session?.mustChangePassword) {
    return <PasswordChangeDialog forced />;
  }

  return <>{children}</>;
};
