"use client";

import { useEffect, useRef } from "react";
import { notifyAttention } from "../lib/attention/attentionAlert";

const BASE_TITLE = "바래다 관계자 웹";

// 탭 제목 — 처리할 것이 있으면 앞에 건수, 비상이 있으면 그것을 먼저 알린다.
export const buildAttentionTitle = (emergencyCount: number, approvalCount: number): string => {
  const total = emergencyCount + approvalCount;
  if (total === 0) return BASE_TITLE;
  return `(${total}) ${emergencyCount > 0 ? "비상 발생 · " : ""}${BASE_TITLE}`;
};

// 미확인 비상·승인 대기 건수를 탭 제목에 반영하고, 건수가 늘면 브라우저 알림을 낸다(사용자가 켠 경우에만).
// `isReady` 전에는 건수가 아직 안 온 것이라 늘었다고 보지 않는다 — 처음 받은 값이 기준선이다.
export const useAttentionSignals = (emergencyCount: number, approvalCount: number, isReady: boolean): void => {
  useEffect(() => {
    document.title = buildAttentionTitle(emergencyCount, approvalCount);
  }, [emergencyCount, approvalCount]);

  useEffect(() => () => void (document.title = BASE_TITLE), []);

  const previous = useRef<{ emergency: number; approval: number } | null>(null);
  useEffect(() => {
    if (!isReady) return;
    const before = previous.current;
    previous.current = { emergency: emergencyCount, approval: approvalCount };
    if (before === null) return;
    if (emergencyCount > before.emergency) {
      notifyAttention("비상 알림", `확인하지 않은 비상 알림이 ${emergencyCount}건 있습니다.`);
    } else if (approvalCount > before.approval) {
      notifyAttention("승인 요청", `처리할 승인 요청이 ${approvalCount}건 있습니다.`);
    }
  }, [emergencyCount, approvalCount, isReady]);
};
