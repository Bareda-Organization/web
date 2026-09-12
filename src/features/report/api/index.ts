import { apiFetch } from "@/shared/lib/http";
import type {
  ReportItemResponseTypes,
  ReportListQueryTypes,
  ReportListResponseTypes,
  ReportType,
} from "../types";

type RawReportItem = {
  report_id: number;
  type: ReportType;
  memo: string;
  run_id: number;
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
  reportId: raw.report_id,
  type: raw.type,
  memo: raw.memo,
  runId: raw.run_id,
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

// GET /staff/reports/{id} — 목록 항목과 동일한 필드 구성이라(실측 확인) 이 화면은
// 별도 상세 페이지를 두지 않는다(판단 근거, 보고서 §1). 404 REPORT_NOT_FOUND 는
// 존재 비노출(Ruling 163) — 호출부가 없어 이 함수만 barrel 없이 남겨 두되, 필요
// 시 재사용할 수 있도록 구현은 해 둔다.
export const getReportDetail = async (reportId: number): Promise<ReportItemResponseTypes> => {
  const raw = await apiFetch<RawReportItem>(`/staff/reports/${reportId}`, { method: "GET" });
  return toItem(raw);
};
