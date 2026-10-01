"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NOTICE_VISIBLE_MS = 4000;

// 저장 같은 조작이 끝났음을 화면에 잠깐 알린다 — 대화상자가 닫히고 표만 바뀌면 저장됐는지 알 수 없다.
// 저장한 행의 키를 함께 주면 같은 시간 동안 `highlightedKey` 로 돌려준다(`RosterTable` 의 행 강조 — R46-FUWEB B1 #19).
export const useSavedNotice = (): {
  notice: string | null;
  highlightedKey: string | null;
  showNotice: (message: string, savedKey?: string) => void;
} => {
  const [saved, setSaved] = useState<{ notice: string; key: string | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showNotice = useCallback((message: string, savedKey?: string) => {
    clearTimeout(timer.current);
    setSaved({ notice: message, key: savedKey ?? null });
    timer.current = setTimeout(() => setSaved(null), NOTICE_VISIBLE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { notice: saved?.notice ?? null, highlightedKey: saved?.key ?? null, showNotice };
};
