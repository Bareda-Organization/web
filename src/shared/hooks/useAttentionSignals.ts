"use client";

import { useEffect, useRef } from "react";
import { notifyAttention } from "../lib/attention/attentionAlert";

/** 브라우저 알림 한 종류의 제목 · 본문(늘어난 뒤의 건수를 받는다). */
export type AttentionText = { title: string; body: (count: number) => string };

/** 콘솔마다 다른 문구 — 탭 기본 제목과 승인 요청 · 차단 계정 알림. */
export type AttentionTexts = { baseTitle: string; approval: AttentionText; blocked?: AttentionText };

/** 관계자 웹 문구(기본값) — 가입 승인과 구간 변경 승인을 한 칸 "승인 요청" 으로 센다. */
export const STAFF_ATTENTION_TEXTS: AttentionTexts = {
  baseTitle: "바래다 관계자 웹",
  approval: { title: "승인 요청", body: (count) => `처리할 승인 요청이 ${count}건 있습니다.` },
};

// 탭 제목 — 처리할 것이 있으면 앞에 건수, 비상이 있으면 그것을 먼저 알린다.
export const buildAttentionTitle = (emergencyCount: number, approvalCount: number, baseTitle: string = STAFF_ATTENTION_TEXTS.baseTitle): string => {
  const total = emergencyCount + approvalCount;
  if (total === 0) return baseTitle;
  return `(${total}) ${emergencyCount > 0 ? "비상 발생 · " : ""}${baseTitle}`;
};

// 미확인 비상·승인 대기(·차단 계정) 건수를 탭 제목에 반영하고, 건수가 늘면 늘어난 종류를 브라우저 알림으로 낸다(사용자가 켠 경우에만).
// `isReady` 전에는 건수가 아직 안 온 것이라 늘었다고 보지 않는다 — 처음 받은 값이 기준선이다.
// `texts` 는 모듈 상수를 넘긴다(렌더마다 새로 만들면 효과가 매번 다시 돈다). `blockedCount` 는 메인 관리자 콘솔만 넘긴다.
export const useAttentionSignals = (
  emergencyCount: number,
  approvalCount: number,
  isReady: boolean,
  texts: AttentionTexts = STAFF_ATTENTION_TEXTS,
  blockedCount = 0,
): void => {
  useEffect(() => {
    document.title = buildAttentionTitle(emergencyCount, approvalCount + blockedCount, texts.baseTitle);
  }, [emergencyCount, approvalCount, blockedCount, texts.baseTitle]);

  useEffect(() => () => void (document.title = texts.baseTitle), [texts.baseTitle]);

  const previous = useRef<{ emergency: number; approval: number; blocked: number } | null>(null);
  useEffect(() => {
    if (!isReady) return;
    const before = previous.current;
    previous.current = { emergency: emergencyCount, approval: approvalCount, blocked: blockedCount };
    if (before === null) return;
    if (emergencyCount > before.emergency) {
      notifyAttention("비상 알림", `확인하지 않은 비상 알림이 ${emergencyCount}건 있습니다.`);
    } else if (approvalCount > before.approval) {
      notifyAttention(texts.approval.title, texts.approval.body(approvalCount));
    } else if (blockedCount > before.blocked && texts.blocked) {
      notifyAttention(texts.blocked.title, texts.blocked.body(blockedCount));
    }
  }, [emergencyCount, approvalCount, blockedCount, isReady, texts]);
};
