import type { RunItemResponseTypes, RunStatus, ScheduleDirection, ScheduleItemResponseTypes, ScheduleWeekday } from "../types";

// 운행 스케줄 화면의 계산 — 요일표(차량 × 방향 × 요일) · 지표 · "이 수정이 반영되는 회차" 미리보기. 서버 값에서 뽑는 순수 함수 모음.
export const WEEKDAYS: ScheduleWeekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DIRECTIONS: ScheduleDirection[] = ["to_academy", "from_academy"];
export const WEEKDAY_LABEL: Record<ScheduleWeekday, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };

export type GridBus = { id: string; busNo: string; plateNo?: string; operable?: boolean };

export type ScheduleGridRow = {
  bus: GridBus;
  directions: ScheduleDirection[];
  cells: Record<ScheduleDirection, Partial<Record<ScheduleWeekday, ScheduleItemResponseTypes>>>;
  hasSchedules: boolean;
};

export const buildScheduleGrid = (schedules: ScheduleItemResponseTypes[], buses: GridBus[], filter: { busId?: string; direction?: ScheduleDirection } = {}): ScheduleGridRow[] =>
  buses
    .filter((bus) => !filter.busId || bus.id === filter.busId)
    .map((bus) => {
      const cells: ScheduleGridRow["cells"] = { to_academy: {}, from_academy: {} };
      const mine = schedules.filter((schedule) => schedule.busId === bus.id);
      mine.forEach((schedule) => {
        cells[schedule.direction][schedule.weekday] = schedule;
      });
      return { bus, directions: filter.direction ? [filter.direction] : DIRECTIONS, cells, hasSchedules: mine.length > 0 };
    });

export type ScheduleSummary = {
  total: number;
  inactive: number;
  busCount: number;
  /** 활성인데 같은 차량·요일·방향 편성의 정차지가 0곳 — 시각만 있고 도는 길이 없다. 편성이 없어 null 인 것은 단정하지 않는다 */
  emptyRoute: ScheduleItemResponseTypes[];
  inactiveSchedules: ScheduleItemResponseTypes[];
};

export const summarizeSchedules = (schedules: ScheduleItemResponseTypes[]): ScheduleSummary => ({
  total: schedules.length,
  inactive: schedules.filter((schedule) => !schedule.active).length,
  busCount: new Set(schedules.map((schedule) => schedule.busId)).size,
  emptyRoute: schedules.filter((schedule) => schedule.active && schedule.routeStopCount === 0),
  inactiveSchedules: schedules.filter((schedule) => !schedule.active),
});

// --- 날짜 계산(달력만 넘긴다 — 시간대 변환 없이 서버가 준 오늘 `YYYY-MM-DD` 기준) -----------------------

const WEEKDAY_BY_UTC_DAY: ScheduleWeekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const parseDate = (date: string): Date => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
export const addDays = (date: string, days: number): string => {
  const next = parseDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};
export const weekdayOf = (date: string): ScheduleWeekday => WEEKDAY_BY_UTC_DAY[parseDate(date).getUTCDay()];
/** "10월 3일 (토)" */
export const formatDateWithWeekday = (date: string): string => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 (${WEEKDAY_LABEL[weekdayOf(date)]})`;
/** `after` 이후 처음 오는 `weekday` 의 날짜(같은 날은 제외) */
const nextDateOf = (weekday: ScheduleWeekday, after: string): string => {
  let date = addDays(after, 1);
  while (weekdayOf(date) !== weekday) date = addDays(date, 1);
  return date;
};

// --- 수정 미리보기 --------------------------------------------------------------------------

type EditableFields = Pick<ScheduleItemResponseTypes, "weekday" | "direction" | "departTime" | "active" | "busId" | "originName" | "destinationName" | "estDurationMin">;

export type TomorrowEffect =
  | { kind: "none"; date: string; weekday: ScheduleWeekday }
  | { kind: "same" | "moved" | "canceled" | "created"; date: string; weekday: ScheduleWeekday };

export type SchedulePreview = {
  /** 오늘 회차는 건드리지 않는다(확정 배치가 걸려 있을 수 있다) */
  today: { kind: "unchanged"; date: string; runs: { departTime: string; status: RunStatus }[] };
  tomorrow: TomorrowEffect;
  /** 수정된 요일의 다음 날짜 — 그 전날 00:05 에 새 값으로 회차가 만들어진다(활성일 때만) */
  next: { date: string; createdOn: string; active: boolean; weekday: ScheduleWeekday };
};

const sameValues = (a: EditableFields, b: EditableFields): boolean =>
  a.weekday === b.weekday && a.direction === b.direction && a.departTime === b.departTime && a.active === b.active && a.busId === b.busId && a.originName === b.originName && a.destinationName === b.destinationName && a.estDurationMin === b.estDurationMin;

// §5.10 스케줄 변경의 반영(Ruling 366 ②): service_date > 오늘 · idle · 미취소 회차에만 반영한다. 오늘 회차는 그대로, 내일 회차는 요일이 맞을 때만 영향.
// 화면이 규칙표대로 근사한다(Ruling 827) — 서버가 미리보기를 주지 않는다. 최종 결과는 저장할 때 서버가 정한다(DUPLICATE_RUN 포함).
export const previewScheduleChange = (before: ScheduleItemResponseTypes, after: EditableFields, runs: RunItemResponseTypes[], today: string): SchedulePreview => {
  const tomorrowDate = addDays(today, 1);
  const tomorrowWeekday = weekdayOf(tomorrowDate);
  const beforeHits = before.active && before.weekday === tomorrowWeekday;
  const afterHits = after.active && after.weekday === tomorrowWeekday;

  let tomorrow: TomorrowEffect;
  if (beforeHits && afterHits) tomorrow = { kind: sameValues(before, after) ? "same" : "moved", date: tomorrowDate, weekday: tomorrowWeekday };
  else if (beforeHits) tomorrow = { kind: "canceled", date: tomorrowDate, weekday: tomorrowWeekday };
  else if (afterHits) tomorrow = { kind: "created", date: tomorrowDate, weekday: tomorrowWeekday };
  else tomorrow = { kind: "none", date: tomorrowDate, weekday: tomorrowWeekday };

  const nextDate = nextDateOf(after.weekday, tomorrowDate);
  return {
    today: {
      kind: "unchanged",
      date: today,
      runs: runs.filter((run) => run.scheduleId === before.id && run.serviceDate === today && run.canceledAt === null).map((run) => ({ departTime: run.departTime, status: run.status })),
    },
    tomorrow,
    next: { date: nextDate, createdOn: addDays(nextDate, -1), active: after.active, weekday: after.weekday },
  };
};

/** "12:41" → "12:11" — 확정 시각은 출발 30분 전(C-03) */
export const confirmTimeOf = (departHhmm: string): string => {
  const [hour, minute] = departHhmm.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "";
  const total = (hour * 60 + minute - 30 + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
