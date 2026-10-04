import { useEffect, useState } from "react";

// 지금 시각(ms) — `intervalMs` 마다 다시 읽는다. `enabled=false` 면 멈춘다(카운트다운이 필요 없는 화면은 타이머를 걸지 않는다).
export const useNow = (intervalMs: number, enabled = true): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
};

// 남은 시간 "2:41"(분:초) — 이미 지났으면 null.
export const formatCountdown = (deadlineMs: number, nowMs: number): string | null => {
  const total = Math.floor((deadlineMs - nowMs) / 1000);
  if (total <= 0) return null;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

// 남은 시간 "1시간 48분" · "6분" — 분 단위 올림. 이미 지났으면 null.
export const formatMinutesLeft = (deadlineMs: number, nowMs: number): string | null => {
  const minutes = Math.ceil((deadlineMs - nowMs) / 60_000);
  if (minutes <= 0) return null;
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간${minutes % 60 ? ` ${minutes % 60}분` : ""}` : `${minutes}분`;
};
