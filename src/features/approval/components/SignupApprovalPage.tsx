"use client";

import { useMemo, useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Button, Card, EmptyState, PageHeader, Pagination, RosterTable, StatusChip, Tabs } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getSignupRequests } from "../api";
import { SIGNUP_ROLE_LABEL } from "../lib/signupRoleLabel";
import { formatElapsed } from "@/shared/lib/format/elapsed";
import type { SignupRequestItemResponseTypes } from "../types";
import { useApprovalPending } from "./ApprovalPendingProvider";
import { SignupDecidePanel } from "./SignupDecidePanel";
import { StyledSignupApprovalLayout, StyledSignupBoard, StyledSignupFooter, StyledWaitedNote } from "./SignupApprovalPage.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";

// §5.1 `status` 값은 `pending` · `accepted` · `rejected` 셋뿐이고 그 밖의 값은 422 VALIDATION_FAILED 다(Ruling 848 ②) —
// §5.2 응답의 `account_status`(`active`) 와 값이 다르니 섞지 않는다. ChangeApproval 의 `status=all` 500 결함
// (changeApprovals.ts 주석)과 같은 함정을 피하려고 "전체" 옵션은 넣지 않는다.
const PAGE_SIZE = 20;

// 목록 열 "다음 단계" — 역할마다 필요한 일이 다르다(학생 · 기사 · 동승자는 기록 연결 필수, 학부모는 불필요 — Ruling 324).
const NEXT_STEP: Record<SignupRequestItemResponseTypes["role"], string> = {
  parent: "계정 활성화",
  student: "학생 기록 연결",
  driver: "매니저 기록 연결",
  escort: "매니저 기록 연결",
};

// §5.1 GET /staff/signup-requests(A-02) · §5.2 POST .../decide(A-02) — 가입 승인
// 화면(UF-M-01).
export const SignupApprovalPage = () => {
  const [status, setStatus] = useState("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { refresh: refreshPending } = useApprovalPending();

  // 상태 탭을 바꾸면 0쪽부터 다시 읽는다(usePagedList 의 resetKey) — 옛 탭의 마지막 쪽이 새 탭에서는 범위 밖일 수 있다.
  const {
    items: requests,
    data,
    totalCount,
    hasNext,
    page,
    setPage,
    loading,
    error,
    reload,
  } = usePagedList(
    async (targetPage) => {
      const result = await getSignupRequests(status, targetPage, PAGE_SIZE);
      setNowMs(Date.now());
      return result;
    },
    { resetKey: status, errorMessage: "가입 요청 목록을 불러오지 못했습니다" },
  );
  const pendingCount = data?.pendingCount ?? 0;

  // 오래 기다린 순(§5.1 정렬 — 서버 기본이 requested_at 오름차순이지만 화면도 한 번 더 보장한다).
  const sorted = useMemo(
    () => (status === "pending" ? [...requests].sort((a, b) => Date.parse(a.requestedAt) - Date.parse(b.requestedAt)) : requests),
    [requests, status],
  );
  // 처리 대기 탭에서는 고른 요청(없으면 맨 위)이 오른쪽 패널에 열린다. 승인·거절 뒤 목록이 새로 오면 다음 요청으로 이어진다.
  const selected = status === "pending" ? (sorted.find((row) => row.requestId === selectedId) ?? sorted[0] ?? null) : null;

  const columns: RosterColumn<SignupRequestItemResponseTypes>[] = [
    {
      key: "name",
      label: "신청자",
      render: (row) => (
        <>
          <b>{row.name}</b>
          <StyledWaitedNote>{row.phone}</StyledWaitedNote>
        </>
      ),
    },
    {
      key: "role",
      label: "구분",
      render: (row) => (
        <StatusChip tone={row.role === "student" ? "info" : "off"} marker={false}>
          {SIGNUP_ROLE_LABEL[row.role]}
        </StatusChip>
      ),
    },
    {
      key: "requestedAt",
      label: "신청 일시",
      render: (row) => (
        <>
          {formatDateTime(row.requestedAt)}
          <StyledWaitedNote>{formatElapsed(row.requestedAt, nowMs)}</StyledWaitedNote>
        </>
      ),
    },
    { key: "next", label: "다음 단계", render: (row) => NEXT_STEP[row.role] },
    ...(status === "pending"
      ? [
          {
            key: "action",
            label: "처리",
            align: "right" as const,
            render: (row: SignupRequestItemResponseTypes) => (
              <Button variant="secondary" size="sm" aria-label={`${row.name} 처리`} onClick={() => setSelectedId(row.requestId)}>
                처리
              </Button>
            ),
          },
        ]
      : []),
  ];

  const isEmpty = !loading && !error && requests.length === 0;

  return (
    <StyledSignupApprovalLayout>
      <PageHeader
        title="가입 승인"
        description={error ? undefined : `처리 대기 ${pendingCount}건 · 승인하면 신청자의 계정이 학생·매니저 기록과 연결되어 사용할 수 있게 됩니다`}
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Tabs
        aria-label="처리 상태"
        items={[
          { value: "pending", label: "처리 대기", count: pendingCount },
          { value: "accepted", label: "승인 완료" },
          { value: "rejected", label: "거절됨" },
        ]}
        value={status}
        onChange={setStatus}
      />

      <StyledSignupBoard>
        <Card padding={0} aria-busy={loading}>
          {isEmpty ? (
            <EmptyState icon="user-check" title={status === "pending" ? "처리 대기 중인 가입 요청이 없습니다" : "이 상태의 가입 요청이 없습니다"} />
          ) : (
            <RosterTable
              hasError={Boolean(error)}
              onRetry={reload}
              columns={columns}
              loading={loading}
              rows={sorted}
              selectedKey={selected?.requestId ?? null}
              getRowKey={(row) => row.requestId}
              onRowClick={status === "pending" ? (row) => setSelectedId(row.requestId) : undefined}
            />
          )}
          <StyledSignupFooter>
            <span>오래 기다린 순</span>
            <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />
          </StyledSignupFooter>
        </Card>

        {selected ? (
          <SignupDecidePanel
            key={selected.requestId}
            request={selected}
            waited={formatElapsed(selected.requestedAt, nowMs)}
            onDone={() => {
              setSelectedId(null);
              reload();
              void refreshPending();
            }}
          />
        ) : null}
      </StyledSignupBoard>
    </StyledSignupApprovalLayout>
  );
};
