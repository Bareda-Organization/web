import { apiFetch } from "@/shared/lib/http";
import { asIdString } from "@/shared/lib/ws";
import type { WithId } from "@/shared/lib/http/wireId";
import type {
  ReportItemResponseTypes,
  ReportListQueryTypes,
  ReportListResponseTypes,
} from "../types";

// 서버 id 는 숫자 — 화면 타입은 문자열. reportedByRole·handledByName 은 서버가 아직 안 주면 null 로 메운다(Ruling 814).
type WireReportItem = Omit<WithId<ReportItemResponseTypes, "reportId" | "runId">, "reportedByRole" | "handledByName"> & {
  reportedByRole?: ReportItemResponseTypes["reportedByRole"];
  handledByName?: string | null;
};

const toItem = (raw: WireReportItem): ReportItemResponseTypes => ({
  ...raw,
  reportId: asIdString(raw.reportId),
  runId: asIdString(raw.runId),
  reportedByRole: raw.reportedByRole ?? null,
  handledByName: raw.handledByName ?? null,
});

// GET /staff/reports(§5.20, EXC-02·03, M-14) — 페이징 없음(실측 확인, types/index.ts 주석).
export const getReports = async (filters: ReportListQueryTypes = {}): Promise<ReportListResponseTypes> => {
  const raw = await apiFetch<{ items: WireReportItem[]; counts?: ReportListResponseTypes["counts"] }>("/staff/reports", {
    method: "GET",
    query: { type: filters.type, date: filters.date, run_id: filters.runId, handled: filters.handled },
  });
  return { items: raw.items.map(toItem), counts: raw.counts ?? null };
};

// POST /staff/reports/{id}/handle (§5.20, Ruling 814) — 보고를 처리됨으로 표시한다. 본문 없음 · 멱등(이미 처리됐으면 바꾸지 않고 그대로 200) · 처리 취소 경로 없음.
// 응답은 목록 항목 모양이다(§1.9).
export const handleReport = async (reportId: string): Promise<ReportItemResponseTypes> => {
  const raw = await apiFetch<WireReportItem>(`/staff/reports/${reportId}/handle`, { method: "POST" });
  return toItem(raw);
};
