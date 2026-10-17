import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  DashboardResponseTypes,
  DashboardRunResponseTypes,
  LastDelayNoticeResponseTypes,
  NoShowCaseResponseTypes,
} from "../types";

// 서버가 아직 안 주면 없는 칸(Ruling 810)과 숫자 id 를 받는 서버 모양.
type WireDashboardRun = Omit<
  DashboardRunResponseTypes,
  "runId" | "noShowCases" | "driverPhone" | "escortPhone" | "noShowCount" | "absentCount" | "delayMinutes" | "lastDelayNotice"
> & {
  runId: string | number;
  noShowCases: (Omit<NoShowCaseResponseTypes, "callAttempts" | "lastContactResult"> &
    Partial<Pick<NoShowCaseResponseTypes, "callAttempts" | "lastContactResult">>)[];
  driverPhone?: string | null;
  escortPhone?: string | null;
  noShowCount?: number;
  absentCount?: number;
  delayMinutes?: number | null;
  lastDelayNotice?: (Omit<LastDelayNoticeResponseTypes, "reason" | "recipientCount"> &
    Partial<Pick<LastDelayNoticeResponseTypes, "reason" | "recipientCount">>) | null;
};

// 서버 id 는 숫자 · 빠진 칸은 기본값으로 채운다(미승차 수는 진행 중 케이스 수).
const toDashboardRun = (raw: WireDashboardRun): DashboardRunResponseTypes => ({
  ...raw,
  runId: asIdString(raw.runId),
  noShowCases: raw.noShowCases.map((c) => ({ ...c, callAttempts: c.callAttempts ?? 0, lastContactResult: c.lastContactResult ?? null })),
  driverPhone: raw.driverPhone ?? null,
  escortPhone: raw.escortPhone ?? null,
  noShowCount: raw.noShowCount ?? raw.noShowCases.length,
  absentCount: raw.absentCount ?? 0,
  delayMinutes: raw.delayMinutes ?? null,
  lastDelayNotice: raw.lastDelayNotice
    ? { ...raw.lastDelayNotice, reason: raw.lastDelayNotice.reason ?? null, recipientCount: raw.lastDelayNotice.recipientCount ?? 0 }
    : null,
});

// GET /staff/dashboard (§5.3, MON-01~04·06, A-03). `date` 를 안 주면 서버가 오늘 기준으로 답한다.
// 회차 표·지표는 이 호출로만 채운다 — 실시간 위치(§5.18)와는 갱신 주기가 다르다
// (대시보드는 화면 진입·수동 새로고침, 위치는 5~10초 폴링 — DashboardPage 주석 참고).
export const getDashboard = async (date?: string): Promise<DashboardResponseTypes> => {
  const raw = await apiFetch<Omit<DashboardResponseTypes, "runs"> & { runs: WireDashboardRun[] }>("/staff/dashboard", {
    method: "GET",
    query: date ? { date } : undefined,
  });
  return { ...raw, runs: raw.runs.map(toDashboardRun) };
};
