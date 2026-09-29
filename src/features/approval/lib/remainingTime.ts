import { useEffect, useState } from "react";

// 마감까지 남은 시간을 "12분 30초" 로 — 이미 지났으면 null. 시분 없이 분·초만 쓴다(처리 기한은 몇 분~몇 시간 단위).
export const formatRemaining = (deadlineMs: number, nowMs: number): string | null => {
  const totalSeconds = Math.floor((deadlineMs - nowMs) / 1000);
  if (totalSeconds <= 0) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours > 0 ? `${hours}시간 ` : ""}${minutes}분 ${seconds}초`;
};

// 1초마다 지금 시각을 갱신해 남은 시간 표시를 살아 있게 한다 — 승인 화면을 열어 둔 채로 기한이 다가오기 때문.
export const useNowEverySecond = (): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
};
