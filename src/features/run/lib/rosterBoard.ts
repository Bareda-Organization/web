import type { RosterItemResponseTypes } from "../types";

// 운행 상세 명단 계산 — 상태 칩 건수 · 상태 필터 · 지도에서 고른 승하차지와 명단 잇기 · 지난/현재/다음 정차지.

export type RosterStatusFilter = "all" | "no_show" | "absent" | "waiting" | "boarded" | "added" | "transfer";

// 승하차지 이름이 비어 있는(예정 명단의 승하차지 미지정) 학생을 묶는 자리 이름.
export const UNASSIGNED_STOP = "승하차지 미지정";

// 묶음 · 필터가 쓰는 승하차지 키 — id 가 있으면 id(같은 이름의 둘을 가른다), 없으면 이름.
export const rosterStopKey = (item: Pick<RosterItemResponseTypes, "stopId" | "stopName">): string =>
  item.stopId ?? item.stopName ?? UNASSIGNED_STOP;

export const rosterCounts = (roster: RosterItemResponseTypes[]): Record<RosterStatusFilter, number> => ({
  all: roster.length,
  no_show: roster.filter((item) => item.status === "no_show").length,
  absent: roster.filter((item) => item.status === "absent").length,
  waiting: roster.filter((item) => item.status === "waiting").length,
  boarded: roster.filter((item) => item.status === "boarded" || item.status === "alighted").length,
  added: roster.filter((item) => item.change === "added").length,
  transfer: roster.filter((item) => item.transferId != null).length,
});

const matchesStatus = (item: RosterItemResponseTypes, status: RosterStatusFilter): boolean => {
  switch (status) {
    case "all":
      return true;
    case "boarded":
      return item.status === "boarded" || item.status === "alighted";
    case "added":
      return item.change === "added";
    case "transfer":
      return item.transferId != null;
    default:
      return item.status === status;
  }
};

export const filterRoster = (roster: RosterItemResponseTypes[], status: RosterStatusFilter): RosterItemResponseTypes[] =>
  roster.filter((item) => matchesStatus(item, status));

type StopRef = { stopId: string; name: string };

// 지도에서 고른 승하차지의 학생만 — 노선(§5.19)의 stopId 와 명단의 stop_id 를 id 로 잇는다(Ruling 811).
// stop_id 가 없는 행(옛 서버 · 확정 전 예정 명단)만 이름으로 짝을 맞춘다.
export const rosterForStop = (roster: RosterItemResponseTypes[], stops: StopRef[], selectedStopId: string | null): RosterItemResponseTypes[] => {
  const selected = stops.find((stop) => stop.stopId === selectedStopId);
  if (!selected) return [];
  return roster.filter((item) => (item.stopId != null ? item.stopId === selected.stopId : item.stopName === selected.name));
};

export type StopPassage = "passed" | "current" | "next" | null;

// 실시간 위치(§5.18)의 현재·다음 정차지 이름으로 각 정차지가 지났는지 · 지금 서 있는지 · 다음인지를 가른다.
// 현재 정차지를 모르면(운행 전 · 위치 미수신) 표시하지 않는다.
export const stopPassage = (stops: StopRef[], stopId: string, currentName: string | null, nextName: string | null): StopPassage => {
  const currentIndex = currentName === null ? -1 : stops.findIndex((stop) => stop.name === currentName);
  if (currentIndex < 0) return null;
  const index = stops.findIndex((stop) => stop.stopId === stopId);
  if (index < 0) return null;
  if (index < currentIndex) return "passed";
  if (index === currentIndex) return "current";
  const nextIndex = nextName === null ? -1 : stops.findIndex((stop, i) => i > currentIndex && stop.name === nextName);
  return index === nextIndex ? "next" : null;
};
