import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { DashboardResponseTypes, DashboardRunResponseTypes, NoShowCaseResponseTypes, RunStatus } from "../types";

type RawNoShowCase = {
  student_name: string;
  stop_name: string;
  expires_at: string;
  call_attempts?: number;
  last_contact_result?: "answered" | "no_answer" | null;
};

type RawDelayNotice = {
  minutes: number;
  reason?: string | null;
  sent_at: string;
  recipient_count?: number;
};

type RawDashboardRun = {
  run_id: string | number;
  bus_no: string;
  direction: "to_academy" | "from_academy";
  depart_time: string;
  started_at: string | null;
  finished_at: string | null;
  est_arrival_time: string | null;
  driver_name: string | null;
  escort_name: string | null;
  boarded_count: number;
  total_count: number;
  run_status: RunStatus;
  added_count: number;
  removed_count: number;
  ack_driver: boolean;
  ack_escort: boolean;
  no_show_cases: RawNoShowCase[];
  // Ruling 810 — 서버가 아직 안 주는 동안은 키가 없을 수 있다.
  driver_phone?: string | null;
  escort_phone?: string | null;
  no_show_count?: number;
  absent_count?: number;
  delay_minutes?: number | null;
  last_delay_notice?: RawDelayNotice | null;
};

type RawDashboard = {
  metrics: {
    moving_buses: number;
    boarded: number;
    no_show: number;
    absent: number;
    unassigned_managers: number;
  };
  runs: RawDashboardRun[];
};

const toNoShowCase = (raw: RawNoShowCase): NoShowCaseResponseTypes => ({
  studentName: raw.student_name,
  stopName: raw.stop_name,
  expiresAt: raw.expires_at,
  callAttempts: raw.call_attempts ?? 0,
  lastContactResult: raw.last_contact_result ?? null,
});

const toDashboardRun = (raw: RawDashboardRun): DashboardRunResponseTypes => ({
  runId: asIdString(raw.run_id),
  busNo: raw.bus_no,
  direction: raw.direction,
  departTime: raw.depart_time,
  startedAt: raw.started_at,
  finishedAt: raw.finished_at,
  estArrivalTime: raw.est_arrival_time,
  driverName: raw.driver_name,
  escortName: raw.escort_name,
  boardedCount: raw.boarded_count,
  totalCount: raw.total_count,
  runStatus: raw.run_status,
  addedCount: raw.added_count,
  removedCount: raw.removed_count,
  ackDriver: raw.ack_driver,
  ackEscort: raw.ack_escort,
  noShowCases: raw.no_show_cases.map(toNoShowCase),
  driverPhone: raw.driver_phone ?? null,
  escortPhone: raw.escort_phone ?? null,
  noShowCount: raw.no_show_count ?? raw.no_show_cases.length,
  absentCount: raw.absent_count ?? 0,
  delayMinutes: raw.delay_minutes ?? null,
  lastDelayNotice: raw.last_delay_notice
    ? {
        minutes: raw.last_delay_notice.minutes,
        reason: raw.last_delay_notice.reason ?? null,
        sentAt: raw.last_delay_notice.sent_at,
        recipientCount: raw.last_delay_notice.recipient_count ?? 0,
      }
    : null,
});

// GET /staff/dashboard (§5.3, MON-01~04·06, A-03). `date` 를 안 주면 서버가 오늘 기준으로 답한다.
// 회차 표·지표는 이 호출로만 채운다 — 실시간 위치(§5.18)와는 갱신 주기가 다르다
// (대시보드는 화면 진입·수동 새로고침, 위치는 5~10초 폴링 — DashboardPage 주석 참고).
export const getDashboard = async (date?: string): Promise<DashboardResponseTypes> => {
  const raw = await apiFetch<RawDashboard>("/staff/dashboard", {
    method: "GET",
    query: date ? { date } : undefined,
  });
  return {
    metrics: {
      movingBuses: raw.metrics.moving_buses,
      boarded: raw.metrics.boarded,
      noShow: raw.metrics.no_show,
      absent: raw.metrics.absent,
      unassignedManagers: raw.metrics.unassigned_managers,
    },
    runs: raw.runs.map(toDashboardRun),
  };
};
