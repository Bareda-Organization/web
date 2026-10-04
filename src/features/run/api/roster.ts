import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { RosterChange, RosterItemResponseTypes, RosterStatus } from "../types";

type RawRosterItem = {
  student_id: string | number;
  name: string;
  class_name: string | null;
  stop_name: string | null; // 예정 명단의 승하차지 미지정 학생(§5.4)
  stop_id?: string | number | null; // Ruling 811 — 노선(§5.19)과 id 로 잇는다. 확정 전 예정 명단 · 옛 서버는 null/부재
  stop_seq?: number | null;
  transfer_id?: string | number | null; // 이동 대기 행에만(§5.4, Ruling 369)
  guardian_phone: string | null; // 보호자 미연결 학생은 null(§5.4 ○, BR-082)
  change: RosterChange;
  status: RosterStatus;
  note: string | null;
};

const toRosterItem = (raw: RawRosterItem): RosterItemResponseTypes => ({
  studentId: asIdString(raw.student_id),
  name: raw.name,
  className: raw.class_name,
  stopName: raw.stop_name,
  stopId: raw.stop_id == null ? null : asIdString(raw.stop_id),
  stopSeq: raw.stop_seq ?? null,
  transferId: raw.transfer_id == null ? null : asIdString(raw.transfer_id),
  guardianPhone: raw.guardian_phone,
  change: raw.change,
  status: raw.status,
  note: raw.note,
});

// GET /staff/runs/{runId}/roster (§5.4, A-06).
// ⚠ 사양 문면은 `items[]` 로 감싼 형태처럼 읽히지만, 실제 백엔드 응답은 배열 하나를
// 그대로 준다(2026-09-12 curl 로 확인). 이 함수가 그 차이를 흡수해 컴포넌트는
// 배열만 받는다 — 실제 응답 형태가 문서와 다르니 §2 에 기록해 둘 것.
export const getRunRoster = async (runId: string): Promise<RosterItemResponseTypes[]> => {
  const raw = await apiFetch<RawRosterItem[]>(`/staff/runs/${runId}/roster`, { method: "GET" });
  return raw.map(toRosterItem);
};
