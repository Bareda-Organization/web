"use client";

import Link from "next/link";
import { useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { AlertBanner, Button, Card, EmptyState, PageHeader, Pagination, RosterTable, StatusChip } from "@/shared/ui";
import { LinkButton } from "@/shared/ui/display";
import type { RosterColumn } from "@/shared/types";
import { getStaffSignupRequests } from "../api";
import { isStaffQuotaFull } from "../lib/staffQuota";
import type { StaffSignupRequestItemResponseTypes } from "../types";
import { useAdminPending } from "./AdminPendingProvider";
import { MemberApprovalDecidePanel } from "./MemberApprovalDecidePanel";
import {
  StyledAcademyCell,
  StyledAcademyDot,
  StyledApplicant,
  StyledApprovalGrid,
  StyledApprovalLeft,
  StyledListHeading,
  StyledMemberApprovalsLayout,
  StyledRulesCard,
  StyledStaffCell,
} from "./MemberApprovalsPage.styled";

const PAGE_SIZE = 20;

// §6.4~§6.5 관계자 가입 승인(O-02). 목록마다 소속 학원을 함께 보여 준다 — 메인 관리자는
// 학원 경계를 넘는 유일한 역할이라(BRIEF-a1.md §2) 어느 학원 요청인지 없이는 처리할 수 없다.
// R48 시안: 왼쪽 목록 · 오른쪽 처리 칸(첫 요청이 처음부터 선택돼 있다) · 목록 아래 승인 규칙.
export const MemberApprovalsPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { refresh: refreshPending } = useAdminPending();
  const {
    items: requests,
    totalCount,
    hasNext,
    page,
    setPage,
    loading,
    error,
    reload,
  } = usePagedList((targetPage) => getStaffSignupRequests({ page: targetPage, size: PAGE_SIZE }), {
    errorMessage: "가입 요청 목록을 불러오지 못했습니다",
  });
  // 고른 요청이 처리돼 목록에서 사라지면 맨 위 요청으로 넘어간다.
  const selected: StaffSignupRequestItemResponseTypes | null = requests.find((request) => request.requestId === selectedId) ?? requests[0] ?? null;

  const columns: RosterColumn<StaffSignupRequestItemResponseTypes>[] = [
    {
      key: "name",
      label: "신청자",
      render: (row) => (
        <StyledApplicant>
          <b>{row.name}</b>
          <small>{row.phone}</small>
        </StyledApplicant>
      ),
    },
    {
      key: "academy",
      label: "소속 학원",
      render: (row) => (
        <StyledAcademyCell>
          <StyledAcademyDot aria-hidden="true" />
          <span>{row.academy.name}</span>
          <small>
            {row.academy.region} · {row.academy.code}
          </small>
        </StyledAcademyCell>
      ),
    },
    // 정원이 찬 학원은 승인할 수 없다(API_SPEC §6.5) — 처리 칸을 열기 전에 목록에서 알아본다.
    {
      key: "academyStaffCount",
      label: "현재 관계자",
      align: "right",
      render: (row) => (
        <StyledStaffCell>
          {row.academyStaffCount}명{isStaffQuotaFull(row.academyStaffCount) ? <StatusChip tone="bad">정원 참</StatusChip> : null}
        </StyledStaffCell>
      ),
    },
    {
      key: "requestedAt",
      label: "신청 일시",
      render: (row) => formatDateTime(row.requestedAt),
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="secondary" size="sm" aria-label={`${row.name} 가입 요청 처리`} onClick={() => setSelectedId(row.requestId)}>
          처리
        </Button>
      ),
    },
  ];

  return (
    <StyledMemberApprovalsLayout>
      <PageHeader style={{ marginBottom: 20 }} title="관계자 가입 승인" description={error ? undefined : `학원 관계자 계정은 메인 관리자가 승인합니다 · 학원당 1명 · 처리 대기 ${totalCount}건`} />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      {!loading && !error && requests.length === 0 ? (
        <Card padding={0}>
          <EmptyState
            icon="user-check"
            title="처리할 가입 요청이 없습니다"
            action={<LinkButton href="/member-accounts">계정 관리 보기</LinkButton>}
          >
            새 관계자가 가입을 신청하면 이 목록과 사이드바 숫자에 바로 나타납니다.
          </EmptyState>
        </Card>
      ) : (
        <StyledApprovalGrid>
          <StyledApprovalLeft>
            <Card padding={0} aria-busy={loading}>
              <StyledListHeading>가입 요청 {totalCount}건</StyledListHeading>
              <RosterTable
                hasError={Boolean(error)}
                onRetry={reload}
                columns={columns}
                loading={loading}
                rows={requests}
                getRowKey={(row) => row.requestId}
                selectedKey={selected?.requestId ?? null}
                rowTone={(row) => (isStaffQuotaFull(row.academyStaffCount) ? "bad" : undefined)}
              />
            </Card>
            <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />
            <StyledRulesCard aria-labelledby="approval-rules-title">
              <h2 id="approval-rules-title">승인 규칙</h2>
              <ul>
                <li>
                  학원당 관계자는 <b>1명</b> — 재직 관계자가 있으면 승인할 수 없습니다
                </li>
                <li>
                  퇴사 처리는 <Link href="/member-accounts">계정 관리</Link>에서 — 처리하면 로그인이 즉시 막힙니다
                </li>
                <li>거절은 정원과 무관하며 사유가 신청자에게 안내됩니다</li>
              </ul>
            </StyledRulesCard>
          </StyledApprovalLeft>
          {selected ? (
            <MemberApprovalDecidePanel
              key={selected.requestId}
              request={selected}
              onDone={() => {
                reload();
                void refreshPending();
              }}
            />
          ) : null}
        </StyledApprovalGrid>
      )}
    </StyledMemberApprovalsLayout>
  );
};
