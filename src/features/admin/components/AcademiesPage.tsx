"use client";

import Link from "next/link";
import { useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Button, EmptyState, FilterBar, PageHeader, Pagination, RosterTable, SearchField, StatStrip, StatusChip, Tabs } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAcademies } from "../api";
import { useAdminPending } from "./AdminPendingProvider";
import type { AcademiesSummaryTypes, AcademyStatus, AcademySummaryResponseTypes } from "../types";
import { AcademyFormDialog } from "./AcademyFormDialog";
import {
  StyledAcademiesLayout,
  StyledAcademyDot,
  StyledAcademyName,
  StyledCardBars,
  StyledCodeChip,
  StyledStaffCount,
  StyledStatusCell,
} from "./AcademiesPage.styled";

const PAGE_SIZE = 20;
// 관계자는 학원마다 1명이다(정원 1 · §6.5 STAFF_QUOTA_EXCEEDED) — "관계자 1 / 1명" 의 분모.
const STAFF_QUOTA = 1;

// 시안의 학원 구분 색 — 운영 중 학원은 두 색을 번갈아, 비활성은 회색(끝남 모양과 같은 색)
const dotColor = (academy: AcademySummaryResponseTypes, index: number): string =>
  academy.status === "inactive" ? "var(--c-end)" : index % 2 === 0 ? "var(--c-a1)" : "var(--c-a2)";

const Bars = ({ parts, label }: { parts: { value: number; color: string }[]; label: string }) => {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total === 0) return null;
  return (
    <StyledCardBars role="img" aria-label={label}>
      {parts
        .filter((part) => part.value > 0)
        .map((part) => (
          <i key={part.color + part.value} style={{ flex: part.value, background: part.color }} />
        ))}
    </StyledCardBars>
  );
};

const nameList = (academies: AcademySummaryResponseTypes[]): string => academies.map((academy) => academy.name).join(" · ");

// 지표 4칸 — 합계는 서버 `summary`(필터·쪽과 무관한 전체, Ruling 806)를 쓴다. 서버가 아직 안 주면 쪽 안의 값으로 세지 않고 칸을 비운다(21곳째부터 틀리므로).
const buildStats = (summary: AcademiesSummaryTypes | null | undefined, items: AcademySummaryResponseTypes[], pendingSignups: number): StatStripItem[] => {
  const hasAddressKnown = items.some((academy) => academy.hasAddress !== undefined);
  const noAddress = items.filter((academy) => academy.hasAddress === false);
  const waiting = items.filter((academy) => (academy.pendingSignupCount ?? 0) > 0);
  const waitingFull = waiting.filter((academy) => academy.staffCount >= STAFF_QUOTA);

  return [
    {
      label: "전체 학원",
      value: summary ? summary.total : "—",
      unit: summary ? "곳" : undefined,
      detail: summary ? (
        <>
          운영 중 {summary.active} · 비활성 {summary.inactive}
          <Bars label={`운영 중 ${summary.active} · 비활성 ${summary.inactive}`} parts={[{ value: summary.active, color: "var(--c-conf)" }, { value: summary.inactive, color: "var(--c-end)" }]} />
        </>
      ) : undefined,
    },
    {
      label: "소속 이용자",
      value: summary ? summary.userCount.toLocaleString("ko-KR") : "—",
      unit: summary ? "명" : undefined,
      detail: (
        <>
          학부모 · 학생 · 매니저 합계
          <Bars
            label="이 쪽 학원별 이용자 비율"
            parts={items.map((academy, index) => ({ value: academy.userCount, color: index % 2 === 0 ? "var(--c-a1)" : "var(--c-a2)" }))}
          />
        </>
      ),
    },
    {
      label: "관계자 가입 대기",
      value: pendingSignups,
      unit: "건",
      tone: pendingSignups > 0 ? "warn" : "neutral",
      detail:
        waitingFull.length > 0 ? (
          <>
            {nameList(waitingFull)} · 정원 찼음
            <br />
            승인하려면 기존 관계자 퇴사 필요
          </>
        ) : pendingSignups > 0 ? (
          "가입 승인 화면에서 처리합니다"
        ) : (
          "대기 중인 가입 요청이 없습니다"
        ),
    },
    {
      label: "주소 미등록",
      value: hasAddressKnown ? noAddress.length : "—",
      unit: hasAddressKnown ? "곳" : undefined,
      tone: noAddress.length > 0 ? "warn" : "neutral",
      detail: (
        <>
          주소가 없으면 회차 확정 불가
          {noAddress.length > 0 ? (
            <>
              <br />({nameList(noAddress)})
            </>
          ) : null}
        </>
      ),
    },
  ];
};

// §6.1~§6.3 학원 목록 · 등록 · 수정(O-01). 관계자 가입은 활성 학원 검색에서 출발하므로
// (BRIEF-a1.md §4.4) 등록 직후 목록을 다시 불러 그 학원이 실제로 뜨는지 화면에서
// 확인할 수 있게 한다.
export const AcademiesPage = () => {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogTarget, setDialogTarget] = useState<{ academyId?: string } | null>(null);
  const { signupCount } = useAdminPending();

  // 검색은 [검색] 을 눌러야 적용된다 — 입력 중인 값(query)과 조회에 쓰는 값(appliedQuery)을 나눈다.
  const [appliedQuery, setAppliedQuery] = useState("");
  const {
    items: academies,
    data,
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
  const summary = data?.summary ?? null;
  const pendingFromItems = academies.reduce((sum, academy) => sum + (academy.pendingSignupCount ?? 0), 0);

  const columns: RosterColumn<AcademySummaryResponseTypes>[] = [
    {
      key: "name",
      label: "학원",
      render: (row) => (
        <StyledAcademyName>
          <StyledAcademyDot $color={dotColor(row, academies.indexOf(row))} aria-hidden="true" />
          <b>{row.name}</b>
          <small>{row.region}</small>
        </StyledAcademyName>
      ),
    },
    { key: "code", label: "코드", render: (row) => <StyledCodeChip>{row.code}</StyledCodeChip> },
    {
      key: "staffCount",
      label: "관계자",
      align: "right",
      render: (row) => (
        <StyledStaffCount>
          {row.staffCount} <small>/ {STAFF_QUOTA}명</small>
        </StyledStaffCount>
      ),
    },
    { key: "userCount", label: "이용자", align: "right", render: (row) => `${row.userCount}명` },
    {
      key: "status",
      label: "상태",
      render: (row) => (
        <StyledStatusCell>
          {row.status === "active" ? (
            <StatusChip tone="conf" quiet>
              운영 중
            </StatusChip>
          ) : (
            <StatusChip tone="end">비활성</StatusChip>
          )}
          {row.hasAddress === false ? (
            <StatusChip tone="warn" marker={false}>
              주소 미등록
            </StatusChip>
          ) : null}
          {(row.pendingSignupCount ?? 0) > 0 ? (
            <Link href="/member-approvals" aria-label={`${row.name} 관계자 가입 대기 ${row.pendingSignupCount}건 — 가입 승인으로 이동`}>
              <StatusChip tone="info">가입 대기 {row.pendingSignupCount}</StatusChip>
            </Link>
          ) : null}
        </StyledStatusCell>
      ),
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="secondary" size="sm" aria-label={`${row.name} 상세 · 수정`} onClick={() => setDialogTarget({ academyId: row.id })}>
          상세 · 수정
        </Button>
      ),
    },
  ];

  const tabs = [
    { value: "all", label: "전체", count: summary?.total },
    { value: "active", label: "운영 중", count: summary?.active },
    { value: "inactive", label: "비활성", count: summary?.inactive },
  ];

  return (
    <StyledAcademiesLayout>
      <PageHeader
        title="학원 관리"
        description={error ? undefined : `학원 ${summary ? summary.total : totalCount}곳 · 학원 코드는 등록하면 서버가 자동으로 만들어 줍니다`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setDialogTarget({})}>
            학원 등록
          </Button>
        }
      />

      {error ? <AlertBanner tone="missed" title={error} /> : <StatStrip items={buildStats(summary, academies, signupCount > 0 ? signupCount : pendingFromItems)} />}

      <Tabs items={tabs} value={statusFilter} onChange={setStatusFilter} aria-label="운영 상태" />

      <FilterBar style={{ marginTop: 16 }} summary={error ? undefined : `총 ${totalCount}개 학원 · 최근 등록 순`}>
        <SearchField
          placeholder="학원명 · 코드로 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onSubmit={(value) => {
            setQuery(value);
            setAppliedQuery(value);
          }}
        />
      </FilterBar>

      {error || loading || academies.length > 0 ? (
        <RosterTable
          hasError={Boolean(error)}
          onRetry={reload}
          columns={columns}
          loading={loading}
          rows={academies}
          getRowKey={(row) => row.id}
          selectedKey={dialogTarget?.academyId ?? null}
          aria-busy={loading}
        />
      ) : (
        <EmptyState icon="building-2" title={appliedQuery ? "검색 결과가 없습니다" : "등록된 학원이 없습니다"}>
          {appliedQuery ? "학원명이나 코드를 다시 확인해 주세요." : "[학원 등록] 으로 첫 학원을 만드세요."}
        </EmptyState>
      )}

      <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {dialogTarget ? (
        <AcademyFormDialog
          academyId={dialogTarget.academyId}
          onClose={() => setDialogTarget(null)}
          onChanged={reload}
          onDone={() => {
            setDialogTarget(null);
            reload();
          }}
        />
      ) : null}
    </StyledAcademiesLayout>
  );
};
