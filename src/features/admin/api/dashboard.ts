import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { DashboardDays, DashboardResponseTypes } from "../types/dashboard";

type RawId = string | number;

type RawDashboard = {
  as_of: string;
  period: { from: string; to: string; days: number };
  runs: { count: number; previous_count: number; canceled_count: number };
  on_time: { rate: number | null; on_time_count: number; started_count: number; target_rate: number };
  delays: { count: number; today_count: number; peak: { date: string; count: number } | null };
  change_requests: { approved: number; rejected: number; auto_rejected: number; total: number };
  logins: { success: number; fail: number; today_success: number; yesterday_success: number; blocks: number; blocks_released: number };
  daily: { date: string; run_count: number; delay_count: number; login_success: number; login_fail: number }[];
  academies: {
    academy_id: RawId;
    academy_name: string;
    run_count: number;
    on_time_rate: number | null;
    delay_count: number;
    emergency_count: number;
    change_request_count: number;
  }[];
  attention: {
    signup_blocked: { request_id: RawId; name: string; academy_name: string; requested_at: string }[];
    delayed_runs: { run_id: RawId; academy_name: string; bus_no: string; direction: "to_academy" | "from_academy"; delay_minutes: number | null }[];
    expiring_change_requests: {
      run_id: RawId;
      academy_name: string;
      bus_no: string;
      direction: "to_academy" | "from_academy";
      deadline_at: string;
      count: number;
    }[];
    unacked_emergencies: number;
    stale_runs: number;
    confirm_failed_runs: number;
    blocked_accounts: number;
  };
  today_runs: {
    run_id: RawId;
    academy_id: RawId;
    academy_name: string;
    bus_no: string;
    direction: "to_academy" | "from_academy";
    depart_time: string;
    est_arrival_time: string | null;
    run_status: "idle" | "confirmed" | "moving" | "finished";
    started_at: string | null;
    finished_at: string | null;
    delay_minutes: number | null;
    stops_done: number | null;
    stops_total: number | null;
    pending_change_count: number;
    driver_assigned: boolean;
  }[];
  health: { key: "api" | "position" | "confirm_batch" | "notification"; status: "ok" | "warn" | "down"; detail: string | null }[];
  recent_events: {
    at: string;
    kind: "run_confirmed" | "run_started" | "run_finished" | "delay_notified" | "staff_signup_requested";
    academy_name: string;
    run_id?: RawId | null;
    bus_no?: string | null;
    direction?: "to_academy" | "from_academy" | null;
    delay_minutes?: number | null;
    pending_change_count?: number | null;
    name?: string | null;
    status?: string | null;
  }[];
};

const orNull = <T>(value: T | null | undefined): T | null => value ?? null;

// GET /admin/dashboard (§6.18, Ruling 801). `days` 는 1·7·30, `academyId` 를 주면 그 학원만(로그인·시스템 상태·차단 계정은 학원과 무관).
// 서버가 아직 키를 안 보내는 새 필드(백엔드 병합 전)에도 깨지지 않게 배열은 빈 배열, 객체 안의 수는 0 으로 받는다.
export const getDashboard = async (days: DashboardDays, academyId?: string): Promise<DashboardResponseTypes> => {
  const raw = await apiFetch<RawDashboard>("/admin/dashboard", {
    method: "GET",
    query: { days, academy_id: academyId || undefined },
  });
  return {
    asOf: raw.as_of,
    period: raw.period,
    runs: { count: raw.runs.count, previousCount: raw.runs.previous_count, canceledCount: raw.runs.canceled_count },
    onTime: {
      rate: raw.on_time.rate,
      onTimeCount: raw.on_time.on_time_count,
      startedCount: raw.on_time.started_count,
      targetRate: raw.on_time.target_rate,
    },
    delays: { count: raw.delays.count, todayCount: raw.delays.today_count, peak: raw.delays.peak },
    changeRequests: {
      approved: raw.change_requests.approved,
      rejected: raw.change_requests.rejected,
      autoRejected: raw.change_requests.auto_rejected,
      total: raw.change_requests.total,
    },
    logins: {
      success: raw.logins.success,
      fail: raw.logins.fail,
      todaySuccess: raw.logins.today_success,
      yesterdaySuccess: raw.logins.yesterday_success,
      blocks: raw.logins.blocks,
      blocksReleased: raw.logins.blocks_released,
    },
    daily: (raw.daily ?? []).map((day) => ({
      date: day.date,
      runCount: day.run_count,
      delayCount: day.delay_count,
      loginSuccess: day.login_success,
      loginFail: day.login_fail,
    })),
    academies: (raw.academies ?? []).map((academy) => ({
      academyId: asIdString(academy.academy_id),
      academyName: academy.academy_name,
      runCount: academy.run_count,
      onTimeRate: academy.on_time_rate,
      delayCount: academy.delay_count,
      emergencyCount: academy.emergency_count,
      changeRequestCount: academy.change_request_count,
    })),
    attention: {
      signupBlocked: (raw.attention?.signup_blocked ?? []).map((item) => ({
        requestId: asIdString(item.request_id),
        name: item.name,
        academyName: item.academy_name,
        requestedAt: item.requested_at,
      })),
      delayedRuns: (raw.attention?.delayed_runs ?? []).map((item) => ({
        runId: asIdString(item.run_id),
        academyName: item.academy_name,
        busNo: item.bus_no,
        direction: item.direction,
        delayMinutes: item.delay_minutes,
      })),
      expiringChangeRequests: (raw.attention?.expiring_change_requests ?? []).map((item) => ({
        runId: asIdString(item.run_id),
        academyName: item.academy_name,
        busNo: item.bus_no,
        direction: item.direction,
        deadlineAt: item.deadline_at,
        count: item.count,
      })),
      unackedEmergencies: raw.attention?.unacked_emergencies ?? 0,
      staleRuns: raw.attention?.stale_runs ?? 0,
      confirmFailedRuns: raw.attention?.confirm_failed_runs ?? 0,
      blockedAccounts: raw.attention?.blocked_accounts ?? 0,
    },
    todayRuns: (raw.today_runs ?? []).map((run) => ({
      runId: asIdString(run.run_id),
      academyId: asIdString(run.academy_id),
      academyName: run.academy_name,
      busNo: run.bus_no,
      direction: run.direction,
      departTime: run.depart_time,
      estArrivalTime: run.est_arrival_time,
      runStatus: run.run_status,
      startedAt: run.started_at,
      finishedAt: run.finished_at,
      delayMinutes: run.delay_minutes,
      stopsDone: run.stops_done,
      stopsTotal: run.stops_total,
      pendingChangeCount: run.pending_change_count,
      driverAssigned: run.driver_assigned,
    })),
    health: raw.health ?? [],
    recentEvents: (raw.recent_events ?? []).map((event) => ({
      at: event.at,
      kind: event.kind,
      academyName: event.academy_name,
      runId: event.run_id === undefined || event.run_id === null ? null : asIdString(event.run_id),
      busNo: orNull(event.bus_no),
      direction: orNull(event.direction),
      delayMinutes: orNull(event.delay_minutes),
      pendingChangeCount: orNull(event.pending_change_count),
      name: orNull(event.name),
      status: orNull(event.status),
    })),
  };
};
