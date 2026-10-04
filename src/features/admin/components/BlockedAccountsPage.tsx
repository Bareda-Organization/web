"use client";

import { useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { formatRole } from "@/shared/lib/format/roleLabel";
import { AlertBanner, Button, Card, EmptyState, PageHeader, Pagination, RosterTable, StatusChip } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getBlockedAccounts } from "../api";
import { academyDotColor, eventTimeCell } from "../lib/relativeTime";
import type { BlockedAccountItemResponseTypes } from "../types";
import { useAdminPending } from "./AdminPendingProvider";
import { UnblockConfirmDialog } from "./UnblockConfirmDialog";
import { StyledAcademyCell, StyledAcademyDot, StyledBlockedAccountsLayout, StyledBlockedName, StyledNoticeSlot, StyledTimeCell } from "./BlockedAccountsPage.styled";

// W6 — 차단 직전 계정 상태(§6.10 `status_before_block`). 해제하면 이 값으로
// 되돌아간다(§6.12 · Ruling 328) — 관리자가 "해제 후: 승인 대기" 를 누르기
// 전에 미리 볼 수 있어야 한다(`UF-O-03`).
const AfterStatusChip = ({ status }: { status: BlockedAccountItemResponseTypes["statusBeforeBlock"] }) => {
  if (status === "active") return <StatusChip tone="conf" quiet>활성</StatusChip>;
  if (status === "pending") return <StatusChip tone="warn" marker={false}>승인 대기</StatusChip>;
  return <StatusChip tone="bad" marker={false}>거부됨</StatusChip>;
};

const PAGE_SIZE = 20;

// §6.10·§6.12 차단 계정 해제(O-03). BRIEF-a1.md §4.2 대로 failedAttempts·reason 열을
// 목록에 그대로 두고, 확인 다이얼로그에서 같은 정보를 한 번 더 보여준다.
// R48 시안: 상단 안내 띠(해제는 로그인 차단만 푼다, Ruling 328) · 해제 뒤 상태 칩 · 해제하면 처리 완료 토스트 + 사이드바 배지 갱신(S-04).
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
    {
      key: "name",
      label: "계정",
      render: (row) => (
        <StyledBlockedName>
          <span aria-hidden="true">{row.name.slice(0, 1)}</span>
          <b>{row.name}</b>
          <small>{row.loginId}</small>
        </StyledBlockedName>
      ),
    },
    { key: "role", label: "역할", render: (row) => formatRole(row.role) },
    {
      key: "academyName",
      label: "소속 학원",
      render: (row) => (
        <StyledAcademyCell>
          <StyledAcademyDot $color={academyDotColor(row.academyName)} aria-hidden="true" />
          {row.academyName}
        </StyledAcademyCell>
      ),
    },
    {
      key: "blockedAt",
      label: "차단 시각",
      render: (row) => {
        const cell = eventTimeCell(row.blockedAt);
        return (
          <StyledTimeCell>
            {cell.main}
            <small>{cell.sub}</small>
          </StyledTimeCell>
        );
      },
    },
    { key: "failedAttempts", label: "실패", align: "right", render: (row) => `${row.failedAttempts}회` },
    { key: "reason", label: "사유" },
    // W6 — 해제하면 이 값으로 돌아간다. 해제 단추를 누르기 전에 미리 보여준다.
    { key: "statusBeforeBlock", label: "해제 후 상태", render: (row) => <AfterStatusChip status={row.statusBeforeBlock} /> },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="secondary" size="sm" icon="lock-open" aria-label={`${row.name} 차단 해제`} onClick={() => setTarget(row)}>
          차단 해제
        </Button>
      ),
    },
  ];

  return (
    <StyledBlockedAccountsLayout>
      <PageHeader
        title="차단 해제"
        description={error ? undefined : `로그인 5회 실패로 차단된 계정 ${totalCount}건 · 해제는 메인 관리자만 할 수 있습니다`}
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <StyledNoticeSlot>
        <AlertBanner tone="info" title="해제는 로그인 차단만 풉니다 — 가입 승인을 대신하지 않습니다">
          계정은 <b>차단 직전 상태</b>로 돌아갑니다. ‘승인 대기’로 돌아가는 계정은 해제 뒤에도 가입 승인을 받기 전에는 쓸 수 없습니다.
        </AlertBanner>
      </StyledNoticeSlot>

      {!loading && !error && accounts.length === 0 ? (
        <Card padding={0}>
          <EmptyState icon="shield-check" title="차단된 계정이 없습니다">
            로그인 5회 실패로 차단된 계정이 생기면 이 목록과 사이드바 숫자에 바로 나타납니다.
          </EmptyState>
        </Card>
      ) : (
        <RosterTable
          hasError={Boolean(error)}
          onRetry={reload}
          columns={columns}
          loading={loading}
          rows={accounts}
          getRowKey={(row) => row.accountId}
          selectedKey={target?.accountId ?? null}
          rowTone={(row) => (row.accountId === target?.accountId && row.statusBeforeBlock !== "active" ? "warn" : undefined)}
          aria-busy={loading}
        />
      )}
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
