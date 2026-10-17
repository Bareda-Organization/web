import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { RosterItemResponseTypes } from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열. stopId · stopSeq · transferId 는 없거나 null 일 수 있다
// (확정 전 예정 명단 · 옛 서버 · 이동 대기 행이 아닌 행, Ruling 811 · 369).
type WireRosterItem = Omit<RosterItemResponseTypes, "studentId" | "stopId" | "stopSeq" | "transferId"> & {
  studentId: string | number;
  stopId?: string | number | null;
  stopSeq?: number | null;
  transferId?: string | number | null;
};

const toRosterItem = (raw: WireRosterItem): RosterItemResponseTypes => ({
  ...raw,
  studentId: asIdString(raw.studentId),
  stopId: raw.stopId == null ? null : asIdString(raw.stopId),
  stopSeq: raw.stopSeq ?? null,
  transferId: raw.transferId == null ? null : asIdString(raw.transferId),
});

// GET /staff/runs/{runId}/roster (§5.4, A-06).
// ⚠ 사양 문면은 `items[]` 로 감싼 형태처럼 읽히지만, 실제 백엔드 응답은 배열 하나를
// 그대로 준다. 이 함수가 그 차이를 흡수해 컴포넌트는
// 배열만 받는다 — 실제 응답 형태가 문서와 다르니 §2 에 기록해 둘 것.
export const getRunRoster = async (runId: string): Promise<RosterItemResponseTypes[]> => {
  const raw = await apiFetch<WireRosterItem[]>(`/staff/runs/${runId}/roster`, { method: "GET" });
  return raw.map(toRosterItem);
};
