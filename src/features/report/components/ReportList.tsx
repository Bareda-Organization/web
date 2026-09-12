"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Card, Input, PageHeader, RosterTable, Select } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getReports } from "../api";
import type { ReportItemResponseTypes, ReportType } from "../types";
import { StyledReportFilters, StyledReportLayout } from "./ReportList.styled";

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
  const [items, setItems] = useState<ReportItemResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextType: string, nextDate: string) => {
    setLoading(true);
    try {
      const result = await getReports({
        type: nextType === "" ? undefined : (nextType as ReportType),
        date: nextDate === "" ? undefined : nextDate,
      });
      setItems(result.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "운행 리포트를 불러오지 못했습니다");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(type, date);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const columns: RosterColumn<ReportItemResponseTypes>[] = [
    { key: "reportedAt", label: "신고 시각" },
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
        <Input
          label="날짜"
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            load(type, event.target.value);
          }}
        />
      </StyledReportFilters>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} rows={items} getRowKey={(row) => row.reportId} />
      </Card>
    </StyledReportLayout>
  );
};
