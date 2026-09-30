"use client";

import { useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Badge, Button, Card, PageHeader, Pagination, RosterTable, SearchField, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAcademies } from "../api";
import type { AcademyStatus, AcademySummaryResponseTypes } from "../types";
import { AcademyFormDialog } from "./AcademyFormDialog";
import { StyledAcademiesFilterRow, StyledAcademiesLayout } from "./AcademiesPage.styled";

const PAGE_SIZE = 20;

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
  const [dialogTarget, setDialogTarget] = useState<{ academyId?: string } | null>(null);

  // 검색은 [검색] 을 눌러야 적용된다 — 입력 중인 값(query)과 조회에 쓰는 값(appliedQuery)을 나눈다.
  const [appliedQuery, setAppliedQuery] = useState("");
  const {
    items: academies,
    totalCount,
    hasNext,
    page,
    setPage,
    loading,
    error,
    reload,
  } = usePagedList(
    (targetPage) =>
      getAcademies(appliedQuery || undefined, statusFilter === "all" ? undefined : (statusFilter as AcademyStatus), { page: targetPage, size: PAGE_SIZE }),
    { resetKey: `${appliedQuery}|${statusFilter}`, errorMessage: "학원 목록을 불러오지 못했습니다" },
  );

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
        description={`총 ${totalCount}개 학원`}
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
            setAppliedQuery(value);
          }}
        />
        <SegmentedControl options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
      </StyledAcademiesFilterRow>

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} loading={loading} rows={academies} getRowKey={(row) => row.id} />
      </Card>

      <Pagination page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {dialogTarget ? (
        <AcademyFormDialog
          academyId={dialogTarget.academyId}
          onClose={() => setDialogTarget(null)}
          onDone={() => {
            setDialogTarget(null);
            reload();
          }}
        />
      ) : null}
    </StyledAcademiesLayout>
  );
};
