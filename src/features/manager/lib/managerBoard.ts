import { formatClockTime } from "@/shared/lib/format/clockTime";
import type { ManagerAssignmentTypes, ManagerItemResponseTypes, WorkHours, WorkHoursRange } from "../types";

// 매니저 관리 화면의 계산 — 서버가 준 목록(`assignments[]` · `work_hours`)에서 지표 · 근무 시간 한 줄 · 기사 미배치 후보를 뽑는 순수 함수 모음.

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<(typeof DAY_KEYS)[number], string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };
const EN_WEEKDAY_TO_KEY: Record<string, (typeof DAY_KEYS)[number]> = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };
const SEOUL_WEEKDAY = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short" });

const weekdayKeyOf = (iso: string): (typeof DAY_KEYS)[number] | undefined => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? undefined : EN_WEEKDAY_TO_KEY[SEOUL_WEEKDAY.format(parsed)];
};

const rangeText = (range: WorkHoursRange): string => `${range.start}–${range.end}`;

// "월-토 11:00–22:30" · "화 · 목 · 토 10:00–18:00". 시각이 다른 요일은 / 로 갈라 적는다. 요일당 첫 구간만 쓴다(편집기와 같은 규칙).
export const formatWorkHours = (hours: WorkHours | null): string => {
  const groups = new Map<string, (typeof DAY_KEYS)[number][]>();
  DAY_KEYS.forEach((day) => {
    const first = hours?.[day]?.[0];
    if (!first) return;
    const key = rangeText(first);
    groups.set(key, [...(groups.get(key) ?? []), day]);
  });
  if (groups.size === 0) return "미입력";
  return [...groups.entries()]
    .map(([text, days]) => {
      const indexes = days.map((day) => DAY_KEYS.indexOf(day));
      const contiguous = days.length >= 3 && indexes.every((index, i) => i === 0 || index === indexes[i - 1] + 1);
      const label = contiguous ? `${DAY_LABEL[days[0]]}-${DAY_LABEL[days[days.length - 1]]}` : days.map((day) => DAY_LABEL[day]).join(" · ");
      return `${label} ${text}`;
    })
    .join(" / ");
};

export type ManagerSummary = {
  total: number;
  drivers: number;
  escorts: number;
  linked: number;
  unlinked: number;
  /** 오늘 배치가 있는 매니저 수 */
  assignedToday: number;
  /** 오늘 배치가 없는 매니저 */
  unassignedToday: ManagerItemResponseTypes[];
};

export const assignmentsOn = (manager: ManagerItemResponseTypes, serviceDate: string): ManagerAssignmentTypes[] =>
  manager.assignments.filter((assignment) => assignment.serviceDate === serviceDate);

export const summarizeManagers = (all: ManagerItemResponseTypes[], today: string): ManagerSummary => {
  const unassignedToday = all.filter((manager) => assignmentsOn(manager, today).length === 0);
  return {
    total: all.length,
    drivers: all.filter((manager) => manager.role === "driver").length,
    escorts: all.filter((manager) => manager.role === "escort").length,
    linked: all.filter((manager) => manager.accountId !== null).length,
    unlinked: all.filter((manager) => manager.accountId === null).length,
    assignedToday: all.length - unassignedToday.length,
    unassignedToday,
  };
};

// 그 시각이 근무 시간 안인가 — "HH:mm" 문자열이라 사전순 비교가 시각 순서와 같다.
const isWorkingAt = (manager: ManagerItemResponseTypes, departTime: string): boolean => {
  const day = weekdayKeyOf(departTime);
  const time = formatClockTime(departTime);
  return day !== undefined && (manager.workHours?.[day] ?? []).some((range) => range.start <= time && time <= range.end);
};

/** 그 날짜의 요일에 근무 시간이 있는가 — 오늘 배치가 없어도 쉬는 날이면 "채워야 할 사람" 이 아니다 */
export const worksOn = (manager: ManagerItemResponseTypes, serviceDate: string): boolean => {
  const day = weekdayKeyOf(`${serviceDate}T12:00:00+09:00`);
  return day !== undefined && (manager.workHours?.[day]?.length ?? 0) > 0;
};

/** 기사 미배치 회차에 넣을 수 있는 기사 — 오늘 배치가 없고 그 시각이 근무 시간 안인 기사 */
export const openDriverCandidates = (run: { departTime: string }, all: ManagerItemResponseTypes[], today: string): ManagerItemResponseTypes[] =>
  all.filter((manager) => manager.role === "driver" && assignmentsOn(manager, today).length === 0 && isWorkingAt(manager, run.departTime));

/** "2026-10-03" → "10월 3일" */
export const formatMonthDay = (serviceDate: string): string => {
  const [, month, day] = serviceDate.split("-");
  return month && day ? `${Number(month)}월 ${Number(day)}일` : serviceDate;
};

/** 내일 날짜 — 서버가 준 오늘(`YYYY-MM-DD`)에 하루를 더한다. 시간대 변환 없이 달력만 넘긴다. */
export const nextDay = (serviceDate: string): string => {
  const [year, month, day] = serviceDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
};
