import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type {
  ReportItemResponseTypes,
  ReportListQueryTypes,
  ReportListResponseTypes,
  ReportType,
} from "../types";

type RawReportItem = {
  report_id: string | number;
  type: ReportType;
  memo: string;
  run_id: string | number;
  bus_no: string;
  student_name: string | null;
  reported_by: string;
  reported_by_role?: "driver" | "escort" | null;
  reported_at: string;
  handled: boolean;
  handled_at: string | null;
  handled_by_name?: string | null;
};

type RawReportListResponse = {
  items: RawReportItem[];
  counts?: { handled: number; unhandled: number } | null;
};

const toItem = (raw: RawReportItem): ReportItemResponseTypes => ({
  reportId: asIdString(raw.report_id),
  type: raw.type,
  memo: raw.memo,
  runId: asIdString(raw.run_id),
  busNo: raw.bus_no,
  studentName: raw.student_name,
  reportedBy: raw.reported_by,
  reportedByRole: raw.reported_by_role ?? null,
  reportedAt: raw.reported_at,
  handled: raw.handled,
  handledAt: raw.handled_at,
  handledByName: raw.handled_by_name ?? null,
});

// GET /staff/reports(§5.20, EXC-02·03, M-14) — 페이징 없음(실측 확인, types/index.ts 주석).
export const getReports = async (filters: ReportListQueryTypes = {}): Promise<ReportListResponseTypes> => {
  const raw = await apiFetch<RawReportListResponse>("/staff/reports", {
    method: "GET",
    query: { type: filters.type, date: filters.date, run_id: filters.runId, handled: filters.handled },
  });
  return { items: raw.items.map(toItem), counts: raw.counts ?? null };
};

// POST /staff/reports/{id}/handle (§5.20, Ruling 814) — 보고를 처리됨으로 표시한다. 본문 없음 · 멱등(이미 처리됐으면 바꾸지 않고 그대로 200) · 처리 취소 경로 없음.
// 응답은 목록 항목 모양이다(§1.9).
export const handleReport = async (reportId: string): Promise<ReportItemResponseTypes> => {
  const raw = await apiFetch<RawReportItem>(`/staff/reports/${reportId}/handle`, { method: "POST" });
  return toItem(raw);
};
