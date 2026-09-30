"use client";

import { useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Button, Card, EmptyState, PageHeader, Pagination, RosterTable } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getStaffSignupRequests } from "../api";
import type { StaffSignupRequestItemResponseTypes } from "../types";
import { MemberApprovalDecideDialog } from "./MemberApprovalDecideDialog";
import { StyledMemberApprovalsLayout } from "./MemberApprovalsPage.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";

const PAGE_SIZE = 20;

// §6.4~§6.5 관계자 가입 승인(O-02). 목록마다 소속 학원을 함께 보여 준다 — 메인 관리자는
// 학원 경계를 넘는 유일한 역할이라(BRIEF-a1.md §2) 어느 학원 요청인지 없이는 처리할 수 없다.
export const MemberApprovalsPage = () => {
  const [target, setTarget] = useState<StaffSignupRequestItemResponseTypes | null>(null);
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

  const columns: RosterColumn<StaffSignupRequestItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "phone", label: "연락처" },
    { key: "academy", label: "소속 학원", render: (row) => `${row.academy.name} (${row.academy.region})` },
    { key: "academyStaffCount", label: "현재 관계자 수", align: "right" },
    { key: "requestedAt", label: "신청 일시", render: (row) => formatDateTime(row.requestedAt) },
    {
      key: "action",
      label: "",
      render: (row) => (
        <Button variant="secondary" onClick={() => setTarget(row)}>
          처리
        </Button>
      ),
    },
  ];

  return (
    <StyledMemberApprovalsLayout>
      <PageHeader title="관계자 가입 승인" description={`처리 대기 ${totalCount}건`} />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        {!loading && !error && requests.length === 0 ? (
          <EmptyState icon="user-check" title="처리할 가입 요청이 없습니다" />
        ) : (
          <RosterTable hasError={Boolean(error)} columns={columns} loading={loading} rows={requests} getRowKey={(row) => row.requestId} />
        )}
      </Card>

      <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {target ? (
        <MemberApprovalDecideDialog
          request={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            reload();
          }}
        />
      ) : null}
    </StyledMemberApprovalsLayout>
  );
};
