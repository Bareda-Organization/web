import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import { countSchedulesWithoutRoute } from "../lib/setupProgress";
import type { SetupProgressResponseTypes } from "../types";

type WirePage<T> = { items: T[]; totalCount: number };
type WireKeyed = { busId: string | number; weekday: string; direction: string; active: boolean };

// 개수만 필요한 목록은 1건만 달라고 해 totalCount 를 읽는다(§1.8). 다른 기능의 api 를 import 하지 않으려고
// (기능끼리 import 금지 — CONVENTIONS_REACT) 이 기능이 다섯 목록 엔드포인트를 직접 부른다.
const readPage = <T>(path: string, size: number) => apiFetch<WirePage<T>>(path, { method: "GET", query: { page: 0, size } });

// 서버 id 는 숫자 — 짝 맞추기(countSchedulesWithoutRoute)는 문자열 id 를 쓴다
const toKeyed = (raw: WireKeyed) => ({ ...raw, busId: asIdString(raw.busId) });

// GET /staff/buses · /managers · /students · /routes · /schedules — 시작 체크리스트용(B1 #9, Ruling 493).
// 노선·스케줄은 짝 맞추기에 쓰려고 100건(§1.8 최대)까지 읽는다. 그보다 많은 학원이면 앞 100건 기준의 경고다.
export const getSetupProgress = async (): Promise<SetupProgressResponseTypes> => {
  const [buses, managers, students, routes, schedules] = await Promise.all([
    readPage<unknown>("/staff/buses", 1),
    readPage<unknown>("/staff/managers", 1),
    readPage<unknown>("/staff/students", 1),
    readPage<WireKeyed>("/staff/routes", 100),
    readPage<WireKeyed>("/staff/schedules", 100),
  ]);
  return {
    busCount: buses.totalCount,
    managerCount: managers.totalCount,
    studentCount: students.totalCount,
    routeCount: routes.totalCount,
    scheduleCount: schedules.totalCount,
    schedulesWithoutRoute: countSchedulesWithoutRoute(schedules.items.map(toKeyed), routes.items.map(toKeyed)),
  };
};
