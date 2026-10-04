"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Button, FilterBar, PageHeader, Pagination, RosterTable, SearchField, Select, StatusChip, Tabs } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAllAcademies, getStaffAccounts } from "../api";
import { lastLoginCell } from "../lib/lastLogin";
import { academyDotColor } from "../lib/relativeTime";
import type { AcademySummaryResponseTypes, StaffAccountItemResponseTypes, StaffAccountStatus } from "../types";
import { MemberAccountFormDialog } from "./MemberAccountFormDialog";
import {
  StyledAcademyCell,
  StyledAcademyDot,
  StyledAccountName,
  StyledFilterLabel,
  StyledLoginCell,
  StyledMemberAccountsLayout,
} from "./MemberAccountsPage.styled";

const PAGE_SIZE = 20;

// §6.6~§6.7 관계자 계정 관리(O-02). 목록에 소속 학원 열을 둔다 — 메인 관리자만
// 여러 학원의 계정을 한 화면에서 다루므로 이 열이 없으면 어느 학원 소속인지 알 수 없다.
// R48 시안: 재직 상태 탭(건수 = 서버 counts) · 이름/아이디 검색 · 학원 선택 · 행의 가입 대기 칩. `?academy=<학원 id>` 로 열면 그 학원이 골라져 있다(학원 상세의 [계정 관리]).
export const MemberAccountsPage = () => {
  const initialAcademy = useSearchParams()?.get("academy") ?? "";
  const [target, setTarget] = useState<StaffAccountItemResponseTypes | null>(null);
  const [statusTab, setStatusTab] = useState<StaffAccountStatus>("active");
  const [academyId, setAcademyId] = useState(initialAcademy);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [academies, setAcademies] = useState<AcademySummaryResponseTypes[]>([]);

  // 학원 선택 목록 — 못 받아도 [전체 학원] 으로 계속 쓸 수 있다.
  useEffect(() => {
    (async () => {
      try {
        setAcademies(await getAllAcademies());
      } catch {
        setAcademies([]);
      }
    })();
  }, []);

  const {
    items: accounts,
    data,
    totalCount,
    hasNext,
    page,
    setPage,
    loading,
    error,
    reload,
  } = usePagedList(
    (targetPage) => getStaffAccounts({ page: targetPage, size: PAGE_SIZE }, { academyId: academyId || undefined, q: appliedQuery || undefined, status: statusTab }),
    { resetKey: `${statusTab}|${academyId}|${appliedQuery}`, errorMessage: "관계자 계정 목록을 불러오지 못했습니다" },
  );
  const counts = data?.counts ?? null;

  const columns: RosterColumn<StaffAccountItemResponseTypes>[] = [
    {
      key: "name",
      label: "이름",
      render: (row) => (
        <StyledAccountName>
          <span aria-hidden="true">{row.name.slice(0, 1)}</span>
          <b>{row.name}</b>
          <small>{row.loginId}</small>
        </StyledAccountName>
      ),
    },
    { key: "phone", label: "연락처" },
    {
      key: "academyName",
      label: "소속 학원",
      render: (row) => (
        <StyledAcademyCell>
          <StyledAcademyDot $color={academyDotColor(row.academyName)} aria-hidden="true" />
          {row.academyName}
          {(row.academyPendingSignupCount ?? 0) > 0 ? (
            <Link href="/member-approvals" aria-label={`${row.academyName} 가입 대기 ${row.academyPendingSignupCount}건 — 가입 승인으로 이동`}>
              <StatusChip tone="info">가입 대기 {row.academyPendingSignupCount}</StatusChip>
            </Link>
          ) : null}
        </StyledAcademyCell>
      ),
    },
    {
      key: "lastLoginAt",
      label: "최근 로그인",
      render: (row) => {
        const cell = lastLoginCell(row.lastLoginAt);
        return (
          <StyledLoginCell>
            {cell.main}
            {cell.sub ? <small>{cell.sub}</small> : null}
          </StyledLoginCell>
        );
      },
    },
    {
      key: "status",
      label: "재직 상태",
      render: (row) =>
        row.status === "active" ? (
          <StatusChip tone="conf" quiet>
            재직 중
          </StatusChip>
        ) : (
          <StatusChip tone="end">재직 해제</StatusChip>
        ),
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="secondary" size="sm" aria-label={`${row.name} 계정 관리`} onClick={() => setTarget(row)}>
          관리
        </Button>
      ),
    },
  ];

  const tabs = [
    { value: "active", label: "재직 중", count: counts?.active },
    { value: "inactive", label: "재직 해제", count: counts?.inactive },
  ];
  const academyOptions = [{ value: "", label: "전체 학원" }, ...academies.map((academy) => ({ value: academy.id, label: academy.name }))];

  return (
    <StyledMemberAccountsLayout>
      <PageHeader
        style={{ marginBottom: 20 }}
        title="계정 관리"
        description={error ? undefined : `학원 관계자 계정 ${counts ? counts.active + counts.inactive : totalCount}개 · 학원당 1명 · 퇴사 처리하면 즉시 로그인이 막힙니다`}
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Tabs items={tabs} value={statusTab} onChange={(value) => setStatusTab(value as StaffAccountStatus)} aria-label="재직 상태" />

      <FilterBar style={{ marginTop: 16 }} summary={error ? undefined : `총 ${totalCount}개 계정`}>
        <SearchField
          placeholder="이름 · 아이디로 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onSubmit={(value) => {
            setQuery(value);
            setAppliedQuery(value);
          }}
        />
        <StyledFilterLabel>
          <span aria-hidden="true">학원</span>
          <Select aria-label="학원" value={academyId} onChange={(event) => setAcademyId(event.target.value)} options={academyOptions} />
        </StyledFilterLabel>
      </FilterBar>

      <RosterTable
        hasError={Boolean(error)}
        onRetry={reload}
        columns={columns}
        loading={loading}
        rows={accounts}
        getRowKey={(row) => row.accountId}
        selectedKey={target?.accountId ?? null}
        aria-busy={loading}
        emptyMessage={appliedQuery || academyId ? "조건에 맞는 계정이 없습니다" : statusTab === "inactive" ? "재직 해제된 계정이 없습니다" : "재직 중인 계정이 없습니다"}
      />

      <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {target ? (
        <MemberAccountFormDialog
          account={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            reload();
          }}
        />
      ) : null}
    </StyledMemberAccountsLayout>
  );
};
