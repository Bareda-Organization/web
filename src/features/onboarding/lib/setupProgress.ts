type KeyedRow = { busId: string; weekday: string; direction: string; active: boolean };

const keyOf = (row: KeyedRow) => `${row.busId}|${row.weekday}|${row.direction}`;

/**
 * 차량·요일·방향이 같은 활성 노선이 없는 활성 스케줄의 수. 그 스케줄의 회차는 확정할 고정 노선이 없어
 * 금일 운행 상세에 "고정 노선이 없습니다" 로 뜬다(B1 #9).
 */
export const countSchedulesWithoutRoute = (schedules: KeyedRow[], routes: KeyedRow[]): number => {
  const routeKeys = new Set(routes.filter((route) => route.active).map(keyOf));
  return schedules.filter((schedule) => schedule.active && !routeKeys.has(keyOf(schedule))).length;
};
