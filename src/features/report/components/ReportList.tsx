"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Card, Input, PageHeader, RosterTable, Select } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getDashboard } from "@/features/run";
import { getReports } from "../api";
import type { ReportItemResponseTypes, ReportType } from "../types";
import { StyledReportFilters, StyledReportLayout } from "./ReportList.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { RECENT_LIST_CAP } from "@/shared/lib/format/listCap";

const TYPE_LABEL: Record<ReportType, string> = {
  guardian_absent: "보호자 부재",
  road_block: "도로 통제",
  vehicle_issue: "차량 이상",
  etc: "기타",
};

const TYPE_OPTIONS = [
  { value: "", label: "전체" },
  ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })),
];

// §5.20 GET /staff/reports(EXC-02·03, M-14) — 예외 보고 조회 전용 목록. 페이징
// 없음(types/index.ts 주석에 실측 근거 — shared/types/index.ts 의 §1.8 주석은
// 리포트도 공통 페이징을 쓴다고 적었으나, 실측은 반대였다. 보고서 §2 확신
// 없는 지점). 상세 화면은 목록 항목과 필드 구성이 같아(실측 확인) 따로
// 두지 않는다(판단 근거, 보고서 §1).
export const ReportList = () => {
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [runId, setRunId] = useState("");
  // 회차 필터 후보 — 오늘 회차. 날짜를 비우면 서버가 당일을 주므로(§5.20) 같은 날 기준이다.
  const [runOptions, setRunOptions] = useState<{ value: string; label: string }[]>([{ value: "", label: "전체" }]);
  const [items, setItems] = useState<ReportItemResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 요청 번호 — 조건을 바꾸기 전에 나간 요청의 늦은 응답이 새 조건의 목록을 덮지 않게 한다(F01-05).
  const requestSeq = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDashboard();
        setRunOptions([
          { value: "", label: "전체" },
          ...data.runs.map((run) => ({
            value: run.runId,
            label: `${run.busNo} · ${run.direction === "to_academy" ? "등원" : "하원"}`,
          })),
        ]);
      } catch {
        // 회차 필터는 보조 조건이라 후보를 못 불러도 "전체" 로 조회는 된다 — 본문 오류로 올리지 않는다.
      }
    })();
  }, []);

  // 종류·날짜·회차 어느 것이 바뀌어도 조회는 이 한 곳에서 한 번 나간다.
  useEffect(() => {
    const mine = ++requestSeq.current;
    (async () => {
      setLoading(true);
      try {
        const result = await getReports({
          type: type === "" ? undefined : (type as ReportType),
          date: date === "" ? undefined : date,
          runId: runId === "" ? undefined : runId,
        });
        if (mine !== requestSeq.current) return;
        setItems(result.items);
        setError(null);
      } catch (cause) {
        if (mine !== requestSeq.current) return;
        setError(cause instanceof ApiError ? cause.message : "운행 리포트를 불러오지 못했습니다");
        setItems([]);
      } finally {
        if (mine === requestSeq.current) setLoading(false);
      }
    })();
  }, [type, date, runId]);

  const columns: RosterColumn<ReportItemResponseTypes>[] = [
    { key: "reportedAt", label: "신고 시각", render: (row) => formatDateTime(row.reportedAt) },
    { key: "type", label: "종류", render: (row) => TYPE_LABEL[row.type] },
    { key: "busNo", label: "차량" },
    { key: "studentName", label: "학생", render: (row) => row.studentName ?? "-" },
    { key: "reportedBy", label: "신고자" },
    { key: "memo", label: "내용" },
    {
      key: "handled",
      label: "처리",
      align: "right",
      render: (row) => <Badge tone={row.handled ? "added" : "amber"}>{row.handled ? "처리됨" : "미처리"}</Badge>,
    },
  ];

  return (
    <StyledReportLayout>
      <PageHeader title="운행 리포트" description={`총 ${items.length}건`} />

      <StyledReportFilters>
        <Select label="종류" options={TYPE_OPTIONS} value={type} onChange={(event) => setType(event.target.value)} />
        <Select label="회차" options={runOptions} value={runId} onChange={(event) => setRunId(event.target.value)} />
        <Input label="날짜" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </StyledReportFilters>

      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {items.length >= RECENT_LIST_CAP ? (
        <AlertBanner tone="info" title={`최근 ${RECENT_LIST_CAP}건까지만 표시합니다 — 이전 기록은 날짜로 좁혀 확인하세요`} />
      ) : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} loading={loading} rows={items} getRowKey={(row) => row.reportId} />
      </Card>
    </StyledReportLayout>
  );
};
