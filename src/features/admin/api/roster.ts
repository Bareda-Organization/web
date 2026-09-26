import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  RosterBoardStatus,
  RosterStopResponseTypes,
  RosterStudentResponseTypes,
  RunRosterResponseTypes,
} from "../types";

type RawRosterStudent = {
  student_id: string | number;
  name: string;
  photo_url: string | null;
  student_phone: string | null;
  guardian_phone: string;
  status: RosterBoardStatus;
};

type RawRosterStop = {
  stop_id: string | number;
  seq: number;
  name: string;
  students: RawRosterStudent[];
};

type RawRunRosterResponse = { stops: RawRosterStop[] };

const toRosterStudent = (raw: RawRosterStudent): RosterStudentResponseTypes => ({
  studentId: asIdString(raw.student_id),
  name: raw.name,
  photoUrl: raw.photo_url,
  studentPhone: raw.student_phone,
  guardianPhone: raw.guardian_phone,
  status: raw.status,
});

const toRosterStop = (raw: RawRosterStop): RosterStopResponseTypes => ({
  stopId: asIdString(raw.stop_id),
  seq: raw.seq,
  name: raw.name,
  students: raw.students.map(toRosterStudent),
});

// GET /admin/runs/{runId}/roster (§6.9, O-05 · O-06). 관리자는 마스킹 없는 연락처를
// 받는다(§1.12) — 화면에서 별도 가공 없이 그대로 노출한다.
export const getRunRoster = async (runId: string): Promise<RunRosterResponseTypes> => {
  const raw = await apiFetch<RawRunRosterResponse>(`/admin/runs/${runId}/roster`, { method: "GET" });
  return { stops: raw.stops.map(toRosterStop) };
};
