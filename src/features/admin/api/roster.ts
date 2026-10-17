import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { RosterStopResponseTypes, RosterStudentResponseTypes, RunRosterResponseTypes } from "../types";
import type { WithId } from "./wireId";

type WireRosterStop = Omit<WithId<RosterStopResponseTypes, "stopId">, "students"> & {
  students: WithId<RosterStudentResponseTypes, "studentId">[];
};

// 서버 id 는 숫자 — 화면 타입은 문자열
const toRosterStop = (raw: WireRosterStop): RosterStopResponseTypes => ({
  ...raw,
  stopId: asIdString(raw.stopId),
  students: raw.students.map((student) => ({ ...student, studentId: asIdString(student.studentId) })),
});

// GET /admin/runs/{runId}/roster (§6.9, O-05 · O-06). 관리자는 마스킹 없는 연락처를
// 받는다(§1.12) — 화면에서 별도 가공 없이 그대로 노출한다.
export const getRunRoster = async (runId: string): Promise<RunRosterResponseTypes> => {
  const raw = await apiFetch<{ stops: WireRosterStop[] }>(`/admin/runs/${runId}/roster`, { method: "GET" });
  return { stops: raw.stops.map(toRosterStop) };
};
