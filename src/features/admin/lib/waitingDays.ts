import { DAY_MS, seoulDayMs } from "./staleRuns";

/** 대기가 며칠째인지 — 신청 당일 = 1일째, 서울 달력 날짜 기준(O-02 · UF-O-06). 24시간 단위로 세면 자정 직전 신청이 하루 늦게 2일째가 된다. */
export const waitingDays = (requestedAt: string, now: Date = new Date()): number =>
  Math.max(1, Math.round((seoulDayMs(now) - seoulDayMs(new Date(requestedAt))) / DAY_MS) + 1);
