"use client";

import { useEffect, useState } from "react";
import { formatHeaderDateTime } from "./dateTime";

const TICK_MS = 30_000;

// 두 껍데기(관계자 · 메인 관리자) 머리줄의 날짜·시각 — 열어 둔 채로도 시각이 멈추지 않게 30초마다 다시 읽는다.
export const HeaderClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return <time dateTime={now.toISOString()}>{formatHeaderDateTime(now)}</time>;
};
