"use client";

import { useEffect, useState } from "react";
import { setLeaveWarning } from "./leaveGuard";

// 폼 화면이 "저장하지 않은 변경" 을 잃지 않게 한다(R32-W13) — 앱 안 이동(`confirmLeave`)과 창 닫기(`beforeunload`)에서 묻는다.
// `snapshot` 은 입력값 전부를 이어 붙인 문자열이고, `ready` 가 처음 true 가 될 때의 값을 "저장된 상태" 로 잡는다
// (수정 폼은 서버에서 채운 뒤가 기준). 저장이 성공하면 `markSaved` 로 그 시점의 값을 새 기준으로 삼는다.
export const useLeaveWarning = (snapshot: string, ready: boolean, message: string) => {
  const [baseline, setBaseline] = useState<string | null>(null);
  if (ready && baseline === null) setBaseline(snapshot);

  const dirty = baseline !== null && snapshot !== baseline;

  useEffect(() => {
    setLeaveWarning(dirty ? message : null);
    return () => setLeaveWarning(null);
  }, [dirty, message]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return { dirty, markSaved: (savedSnapshot: string) => setBaseline(savedSnapshot) };
};
