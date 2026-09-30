"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePolling } from "@/shared/hooks";
import { getBlockedAccounts, getStaffSignupRequests } from "../api";

// 메인 관리자가 실시간으로 받는 채널에는 승인·차단 통지가 없어 폴링으로만 센다.
const ADMIN_PENDING_POLL_INTERVAL_MS = 30000;

export type AdminPending = { signupCount: number; blockedCount: number; isReady: boolean };

const AdminPendingContext = createContext<AdminPending>({ signupCount: 0, blockedCount: 0, isReady: false });

// 사이드바 배지용 — 학원 관계자 가입 승인 대기 수와 차단된 계정 수.
export const useAdminPending = (): AdminPending => useContext(AdminPendingContext);

export const AdminPendingProvider = ({ children }: { children: React.ReactNode }) => {
  const [pending, setPending] = useState<AdminPending>({ signupCount: 0, blockedCount: 0, isReady: false });

  // 건수만 필요해 한 건짜리 쪽을 요청한다 — 목록 API 의 전체 건수(totalCount)를 쓴다.
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const [signups, blocked] = await Promise.all([
        getStaffSignupRequests({ page: 0, size: 1 }),
        getBlockedAccounts({ page: 0, size: 1 }),
      ]);
      setPending({ signupCount: signups.totalCount, blockedCount: blocked.totalCount, isReady: true });
      return true;
    } catch {
      // 이미 센 건수를 지우지 않는다 — 다음 주기에 다시 센다.
      return false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  usePolling(refresh, ADMIN_PENDING_POLL_INTERVAL_MS);

  return <AdminPendingContext.Provider value={pending}>{children}</AdminPendingContext.Provider>;
};
