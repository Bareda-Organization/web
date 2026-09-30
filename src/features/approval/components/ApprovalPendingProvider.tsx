"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePolling, useRealtimeChannel } from "@/shared/hooks";
import { academyLiveDestination, type WebSocketEnvelope } from "@/shared/lib/ws";
import { getChangeApprovals, getSignupRequests } from "../api";

// 승인 대기는 WebSocket 통지(approval_requested)가 주 경로이고, 폴링은 통지를 놓친 경우와 가입 신청(통지 없음)을 받치는 보조다.
const APPROVAL_POLL_INTERVAL_MS = 30000;
// 가장 이른 기한을 고를 때 훑는 구간 변경 대기 건수 — 목록 한 쪽(20건)이면 기한 임박 건은 들어 있다.
const CHANGE_PAGE_SIZE = 20;

export type ApprovalPending = {
  signupCount: number;
  changeCount: number;
  // 처리 대기 중인 구간 변경 중 가장 이른 자동 거절 기한(ISO). 없으면 null.
  nextDeadlineAt: string | null;
  // 첫 조회가 끝났는지 — 끝나기 전의 0 을 "없음" 으로 읽지 않게 한다.
  isReady: boolean;
  refresh: () => Promise<boolean>;
};

const EMPTY: ApprovalPending = { signupCount: 0, changeCount: 0, nextDeadlineAt: null, isReady: false, refresh: async () => true };

const ApprovalPendingContext = createContext<ApprovalPending>(EMPTY);

// 관계자 전 화면에서 쓰는 승인 대기 현황 — 사이드바 배지·대시보드 카드·탭 제목이 같은 값을 본다.
export const useApprovalPending = (): ApprovalPending => useContext(ApprovalPendingContext);

const earliest = (deadlines: string[]): string | null =>
  deadlines.length === 0 ? null : deadlines.reduce((a, b) => (Date.parse(a) <= Date.parse(b) ? a : b));

// `(staff)` 레이아웃에 한 번만 둔다 — 대기 건수는 기존 목록 API(`pending_count`)로 센다.
export const ApprovalPendingProvider = ({ academyId, children }: { academyId: string; children: React.ReactNode }) => {
  const [counts, setCounts] = useState<Omit<ApprovalPending, "refresh">>({
    signupCount: 0,
    changeCount: 0,
    nextDeadlineAt: null,
    isReady: false,
  });

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const [signups, changes] = await Promise.all([
        getSignupRequests("pending", 0, 1),
        getChangeApprovals("pending", 0, CHANGE_PAGE_SIZE),
      ]);
      setCounts({
        signupCount: signups.pendingCount,
        changeCount: changes.pendingCount,
        nextDeadlineAt: earliest(changes.items.map((item) => item.deadlineAt)),
        isReady: true,
      });
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

  usePolling(refresh, APPROVAL_POLL_INTERVAL_MS);

  // 구간 변경 신청 통지는 운행 관리 화면이 아니라 여기서 받는다 — 어느 화면에 있든 건수가 바로 오른다(REQ-05).
  const handleEnvelope = useCallback(
    (envelope: WebSocketEnvelope) => {
      if (envelope.event === "approval_requested") void refresh();
    },
    [refresh],
  );
  useRealtimeChannel(academyLiveDestination(academyId), handleEnvelope);

  const value = useMemo(() => ({ ...counts, refresh }), [counts, refresh]);
  return <ApprovalPendingContext.Provider value={value}>{children}</ApprovalPendingContext.Provider>;
};
