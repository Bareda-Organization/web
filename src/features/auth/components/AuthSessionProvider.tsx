"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, registerAuthGateListener } from "@/shared/lib/http";
import { getMe, login as loginRequest, logout as logoutRequest, refresh as refreshRequest } from "../api";
import { AppOnlyRoleError, isWebRole } from "../lib/appOnlyRole";
import type { AuthSession } from "../types";

export type AuthSessionContextValue = {
  // "loading" 인 동안은 세션을 아직 모른다 — 이 값을 보고 화면이 로그인 폼도
  // 대시보드도 아닌 중립 상태를 그려야 "폼이 잠깐 보였다 튀는" 결함을 막는다
  // (BRIEF-web §2). 부트스트랩(새로고침 직후 재발급 + /me)이 끝나야 "ready" 가 된다.
  bootstrapStatus: "loading" | "ready";
  session: AuthSession | null;
  login: (loginId: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
  // 신청 학원을 바꿔 재신청한 뒤, 또는 승인 결과가 바뀌었을 수 있는 시점에
  // 세션을 다시 확인한다(§2.10 GET /me).
  refreshSession: () => Promise<AuthSession | null>;
};

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

const toSession = (me: { accountId: string; role: AuthSession["role"]; status: AuthSession["status"]; academy?: AuthSession["academy"] }): AuthSession => ({
  accountId: me.accountId,
  role: me.role,
  status: me.status,
  academy: me.academy ?? null,
});

export const AuthSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [bootstrapStatus, setBootstrapStatus] = useState<"loading" | "ready">("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  // 부트스트랩이 아직 도는 중에 언마운트되면 setState 를 건너뛴다(개발 모드 StrictMode 이중 마운트 대비).
  const mountedRef = useRef(true);

  const refreshSession = useCallback(async (): Promise<AuthSession | null> => {
    try {
      const me = await getMe();
      const next = toSession(me);
      if (!isWebRole(next.role)) {
        // 새로고침으로 되살아난 앱 전용 계정도 같은 이유로 웹 세션을 만들지 않는다.
        await logoutRequest().catch(() => {});
        if (mountedRef.current) {
          setSession(null);
        }
        return null;
      }
      if (mountedRef.current) {
        setSession(next);
      }
      return next;
    } catch (error) {
      // 인증이 풀렸다는 뜻(401)일 때만 세션을 비운다. 네트워크 오류·5xx 는 일시적일 수 있어 이전 세션을 지키고
      // 오류를 호출자에게 넘긴다 — 서버가 잠깐 안 뜬 사이 새로고침해도 로그인 화면으로 밀려나지 않는다.
      if (error instanceof ApiError && (error.status === 401 || error.code === "TOKEN_EXPIRED" || error.code === "UNAUTHORIZED")) {
        if (mountedRef.current) {
          setSession(null);
        }
        return null;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // 앱 부팅(첫 마운트) 마다 한 번 — access 토큰은 메모리에만 있어 새로고침으로
    // 사라지므로, refresh 쿠키로 재발급받고 /me 로 role·status 를 되찾는다 (UF-X-03).
    (async () => {
      try {
        await refreshRequest();
        await refreshSession();
      } catch {
        if (mountedRef.current) {
          setSession(null);
        }
      } finally {
        if (mountedRef.current) {
          setBootstrapStatus("ready");
        }
      }
    })();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // http 계층이 403 AUTH_PENDING·AUTH_REJECTED 나 refresh 실패를 만나면 세션을
    // 다시 확인한다 — 화면 코드가 아니라 이 창구 하나가 계정 상태 변화를 받는다.
    const unregister = registerAuthGateListener((event) => {
      if (event.type === "session-expired") {
        setSession(null);
        return;
      }
      // "auth-pending" — 최신 상태를 다시 물어 화면(레이아웃 가드)이 대기 화면으로 옮기게 한다.
      // 일시 오류는 이전 세션을 유지한 채 넘어간다 — 처리되지 않은 Promise 거절로 남기지 않는다.
      refreshSession().catch(() => {});
    });
    return unregister;
  }, [refreshSession]);

  const login = useCallback(async (loginId: string, password: string): Promise<AuthSession> => {
    const response = await loginRequest(loginId, password);
    // 앱 전용 역할은 서버 로그인까지 취소하고 세션을 비운다 — 두면 가드가 `/login` ↔ `/dashboard` 를 오간다.
    if (!isWebRole(response.role)) {
      await logoutRequest().catch(() => {});
      setSession(null);
      throw new AppOnlyRoleError();
    }
    const next: AuthSession = {
      accountId: response.accountId,
      role: response.role,
      status: response.status,
      academy: response.academy,
    };
    setSession(next);
    return next;
  }, []);

  // 서버 호출이 실패해도 이 기기의 세션은 비운다 — 비우지 않으면 토큰은 지워졌는데(logoutRequest 의 finally)
  // 화면은 로그인된 채 남아, 다음 요청마다 401 이 난다.
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      setSession(null);
    }
  }, []);

  const value = useMemo<AuthSessionContextValue>(
    () => ({ bootstrapStatus, session, login, logout, refreshSession }),
    [bootstrapStatus, session, login, logout, refreshSession],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
};
