"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NOTICE_VISIBLE_MS = 4000;

// 저장 같은 조작이 끝났음을 화면에 잠깐 알린다 — 대화상자가 닫히고 표만 바뀌면 저장됐는지 알 수 없다.
export const useSavedNotice = (): { notice: string | null; showNotice: (message: string) => void } => {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showNotice = useCallback((message: string) => {
    clearTimeout(timer.current);
    setNotice(message);
    timer.current = setTimeout(() => setNotice(null), NOTICE_VISIBLE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { notice, showNotice };
};
