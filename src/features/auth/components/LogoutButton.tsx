"use client";

import { confirmLeave } from "@/shared/lib/navigation/leaveGuard";
import { Button } from "@/shared/ui";
import { useAuthSession } from "../hooks/useAuthSession";

/**
 * 로그아웃(§2.7, 2026-09-23 사용자 지시) — 세션이 비면 `AuthGateGuard` 가 로그인 화면으로 보낸다. 이동을 여기서
 * 따로 하지 않는 이유는 "세션이 없으면 로그인 화면" 판정이 가드 한 곳에만 있어야 하기 때문이다.
 */
export const LogoutButton = () => {
  const { logout } = useAuthSession();

  const handleClick = () => {
    if (!confirmLeave()) return;
    // 서버 호출이 실패해도 이 기기에서는 로그아웃한다(세션 제공자가 finally 로 비운다). 실패는 조용히 넘기지
    // 않도록 콘솔에 남긴다 — 서버 쪽 refresh 쿠키가 남으면 새로 고침 때 세션이 되살아날 수 있다.
    logout().catch((cause: unknown) => console.warn("로그아웃 요청 실패 — 이 기기에서만 로그아웃했다", cause));
  };

  return (
    <Button variant="ghost" size="sm" icon="log-out" onClick={handleClick}>
      로그아웃
    </Button>
  );
};
