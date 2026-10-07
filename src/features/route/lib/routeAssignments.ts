import type { RunItemResponseTypes } from "@/features/schedule";
import type { RunDirection, Weekday } from "../types";

// 고정 노선 편성의 배치 매니저(A-08) — 고정 노선에는 배치가 없어서, 그 편성(차량 × 요일 × 방향)과 같은 회차의 배치를 본다.

const WEEKDAY_BY_UTC_DAY: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// 운행일(`YYYY-MM-DD`)의 요일 — 날짜만 있는 값이라 UTC 정오로 읽어 브라우저 시간대와 무관하게 같은 요일을 낸다.
export const weekdayOfDate = (date: string): Weekday => WEEKDAY_BY_UTC_DAY[new Date(`${date}T12:00:00Z`).getUTCDay()];

export const addDays = (date: string, days: number): string => {
  const moved = new Date(`${date}T12:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
};

type RouteKey = { busId: string; weekday: Weekday; direction: RunDirection };

// 편성과 차량 · 방향 · 요일이 모두 같은 미취소 회차만, 날짜순으로.
export const runsOfRoute = (runs: RunItemResponseTypes[], route: RouteKey): RunItemResponseTypes[] =>
  runs
    .filter((run) => run.busId === route.busId && run.direction === route.direction && weekdayOfDate(run.serviceDate) === route.weekday && !run.canceledAt)
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
