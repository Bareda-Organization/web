"use client";

import { useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Button, Card, EmptyState, PageHeader, Pagination, RosterTable } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getBlockedAccounts } from "../api";
import type { BlockedAccountItemResponseTypes } from "../types";
import { useAdminPending } from "./AdminPendingProvider";
import { UnblockConfirmDialog } from "./UnblockConfirmDialog";
import { StyledBlockedAccountsLayout } from "./BlockedAccountsPage.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { formatRole } from "@/shared/lib/format/roleLabel";

// W6 — 차단 직전 계정 상태(§6.10 `status_before_block`). 해제하면 이 값으로
// 되돌아간다(§6.12 · Ruling 328) — 관리자가 "해제 후: 승인 대기" 를 누르기
// 전에 미리 볼 수 있어야 한다(`UF-O-03`).
const STATUS_BEFORE_BLOCK_LABEL: Record<BlockedAccountItemResponseTypes["statusBeforeBlock"], string> = {
  active: "활성",
  pending: "승인 대기",
  rejected: "거부됨",
};

const PAGE_SIZE = 20;

// §6.10·§6.12 차단 계정 해제(O-03). BRIEF-a1.md §4.2 대로 failedAttempts·reason 열을
// 목록에 그대로 두고, 확인 다이얼로그에서 같은 정보를 한 번 더 보여준다.
export const BlockedAccountsPage = () => {
  const [target, setTarget] = useState<BlockedAccountItemResponseTypes | null>(null);
  const { refresh: refreshPending } = useAdminPending();
  const {
    items: accounts,
    totalCount,
    hasNext,
    page,
    setPage,
    loading,
    error,
    reload,
  } = usePagedList((targetPage) => getBlockedAccounts({ page: targetPage, size: PAGE_SIZE }), {
    errorMessage: "차단 계정 목록을 불러오지 못했습니다",
  });

  const columns: RosterColumn<BlockedAccountItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "loginId", label: "아이디" },
    { key: "role", label: "역할", render: (row) => formatRole(row.role) },
    { key: "academyName", label: "소속 학원" },
    { key: "blockedAt", label: "차단 시각", render: (row) => formatDateTime(row.blockedAt) },
    { key: "failedAttempts", label: "실패 횟수", render: (row) => `${row.failedAttempts}회` },
    { key: "reason", label: "사유" },
    {
      // W6 — 해제하면 이 값으로 돌아간다. 해제 버튼을 누르기 전에 미리 보여준다.
      key: "statusBeforeBlock",
      label: "해제 후 상태",
      render: (row) => STATUS_BEFORE_BLOCK_LABEL[row.statusBeforeBlock],
    },
    {
      key: "action",
      label: "",
      render: (row) => (
        <Button variant="secondary" onClick={() => setTarget(row)}>
          차단 해제
        </Button>
      ),
    },
  ];

  return (
    <StyledBlockedAccountsLayout>
      <PageHeader title="차단 계정 해제" description={error ? undefined : `현재 차단된 계정 ${totalCount}건`} />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        {!loading && !error && accounts.length === 0 ? (
          <EmptyState icon="shield-check" title="차단된 계정이 없습니다" />
        ) : (
          <RosterTable hasError={Boolean(error)} onRetry={reload} columns={columns} loading={loading} rows={accounts} getRowKey={(row) => row.accountId} />
        )}
      </Card>

      <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {target ? (
        <UnblockConfirmDialog
          account={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            reload();
            void refreshPending();
          }}
        />
      ) : null}
    </StyledBlockedAccountsLayout>
  );
};
