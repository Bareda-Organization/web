"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, RosterTable, SearchField, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAcademies } from "../api";
import type { AcademyStatus, AcademySummaryResponseTypes } from "../types";
import { AcademyFormDialog } from "./AcademyFormDialog";
import { StyledAcademiesFilterRow, StyledAcademiesLayout } from "./AcademiesPage.styled";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "운영 중" },
  { value: "inactive", label: "비활성" },
];

// §6.1~§6.3 학원 목록 · 등록 · 수정(O-01). 관계자 가입은 활성 학원 검색에서 출발하므로
// (BRIEF-a1.md §4.4) 등록 직후 목록을 다시 불러 그 학원이 실제로 뜨는지 화면에서
// 확인할 수 있게 한다.
export const AcademiesPage = () => {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [academies, setAcademies] = useState<AcademySummaryResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogTarget, setDialogTarget] = useState<{ academyId?: number } | null>(null);

  const load = useCallback(async (q: string, status: string) => {
    setLoading(true);
    try {
      const data = await getAcademies(q || undefined, status === "all" ? undefined : (status as AcademyStatus));
      setAcademies(data.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "학원 목록을 불러오지 못했습니다");
      setAcademies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(query, statusFilter);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const columns: RosterColumn<AcademySummaryResponseTypes>[] = [
    { key: "code", label: "코드" },
    { key: "name", label: "학원명" },
    { key: "region", label: "지역" },
    { key: "staffCount", label: "관계자 수", align: "right" },
    { key: "userCount", label: "이용자 수", align: "right" },
    {
      key: "status",
      label: "상태",
      render: (row) => (
        <Badge tone={row.status === "active" ? "added" : "neutral"}>
          {row.status === "active" ? "운영 중" : "비활성"}
        </Badge>
      ),
    },
    {
      key: "action",
      label: "",
      render: (row) => (
        <Button variant="secondary" onClick={() => setDialogTarget({ academyId: row.id })}>
          상세 · 수정
        </Button>
      ),
    },
  ];

  return (
    <StyledAcademiesLayout>
      <PageHeader
        title="학원 관리"
        description={`총 ${academies.length}개 학원`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setDialogTarget({})}>
            학원 등록
          </Button>
        }
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <StyledAcademiesFilterRow>
        <SearchField
          placeholder="학원명으로 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onSubmit={(value) => {
            setQuery(value);
            load(value, statusFilter);
          }}
        />
        <SegmentedControl options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
      </StyledAcademiesFilterRow>

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} rows={academies} getRowKey={(row) => row.id} />
      </Card>

      {dialogTarget ? (
        <AcademyFormDialog
          academyId={dialogTarget.academyId}
          onClose={() => setDialogTarget(null)}
          onDone={() => {
            setDialogTarget(null);
            load(query, statusFilter);
          }}
        />
      ) : null}
    </StyledAcademiesLayout>
  );
};
