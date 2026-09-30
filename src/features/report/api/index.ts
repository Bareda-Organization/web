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
  reported_at: string;
  handled: boolean;
  handled_at: string | null;
};

type RawReportListResponse = {
  items: RawReportItem[];
};

const toItem = (raw: RawReportItem): ReportItemResponseTypes => ({
  reportId: asIdString(raw.report_id),
  type: raw.type,
  memo: raw.memo,
  runId: asIdString(raw.run_id),
  busNo: raw.bus_no,
  studentName: raw.student_name,
  reportedBy: raw.reported_by,
  reportedAt: raw.reported_at,
  handled: raw.handled,
  handledAt: raw.handled_at,
});

// GET /staff/reports(§5.20, EXC-02·03, M-14) — 페이징 없음(실측 확인, types/index.ts 주석).
export const getReports = async (filters: ReportListQueryTypes = {}): Promise<ReportListResponseTypes> => {
  const raw = await apiFetch<RawReportListResponse>("/staff/reports", {
    method: "GET",
    query: { type: filters.type, date: filters.date, run_id: filters.runId },
  });
  return { items: raw.items.map(toItem) };
};
