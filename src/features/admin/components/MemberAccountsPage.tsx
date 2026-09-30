"use client";

import { useState } from "react";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Badge, Button, Card, PageHeader, Pagination, RosterTable } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getStaffAccounts } from "../api";
import type { StaffAccountItemResponseTypes } from "../types";
import { MemberAccountFormDialog } from "./MemberAccountFormDialog";
import { StyledMemberAccountsLayout } from "./MemberAccountsPage.styled";

const PAGE_SIZE = 20;

// §6.6~§6.7 관계자 계정 관리(O-02). 목록에 academyName 열을 둔다 — 메인 관리자만
// 여러 학원의 계정을 한 화면에서 다루므로 이 열이 없으면 어느 학원 소속인지 알 수 없다.
export const MemberAccountsPage = () => {
  const [target, setTarget] = useState<StaffAccountItemResponseTypes | null>(null);
  const {
    items: accounts,
    totalCount,
    hasNext,
    page,
    setPage,
    loading,
    error,
    reload,
  } = usePagedList((targetPage) => getStaffAccounts({ page: targetPage, size: PAGE_SIZE }), {
    errorMessage: "관계자 계정 목록을 불러오지 못했습니다",
  });

  const columns: RosterColumn<StaffAccountItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "loginId", label: "아이디" },
    { key: "phone", label: "연락처" },
    { key: "academyName", label: "소속 학원" },
    { key: "lastLoginAt", label: "최근 로그인", render: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "기록 없음") },
    {
      key: "status",
      label: "재직 상태",
      render: (row) => (
        <Badge tone={row.status === "active" ? "added" : "neutral"}>
          {row.status === "active" ? "재직 중" : "재직 해제"}
        </Badge>
      ),
    },
    {
      key: "action",
      label: "",
      render: (row) => (
        <Button variant="secondary" onClick={() => setTarget(row)}>
          관리
        </Button>
      ),
    },
  ];

  return (
    <StyledMemberAccountsLayout>
      <PageHeader title="관계자 계정 관리" description={`전체 ${totalCount}개 계정`} />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} loading={loading} rows={accounts} getRowKey={(row) => row.accountId} />
      </Card>

      <Pagination page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

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
