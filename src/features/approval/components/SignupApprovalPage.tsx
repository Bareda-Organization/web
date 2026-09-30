"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, PageHeader, Pagination, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getSignupRequests } from "../api";
import { SIGNUP_ROLE_LABEL } from "../lib/signupRoleLabel";
import type { SignupRequestItemResponseTypes } from "../types";
import { SignupDecideDialog } from "./SignupDecideDialog";
import { StyledSignupApprovalLayout } from "./SignupApprovalPage.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";

// §5.1 은 `status` 값 목록을 열거하지 않고 "기본값 pending" 만 명시한다. §5.2 응답의
// `account_status`(`active`|`rejected`) 를 근거로 나머지 두 값을 추정해 필터로 뒀다
// (판단 근거, 보고서 §1) — ChangeApproval 의 `status=all` 500 결함(changeApprovals.ts
// 주석)과 같은 함정을 피하려고 "전체" 옵션은 넣지 않는다.
const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "pending", label: "처리 대기" },
  { value: "active", label: "승인 완료" },
  { value: "rejected", label: "거절됨" },
];

// §5.1 GET /staff/signup-requests(A-02) · §5.2 POST .../decide(A-02) — 가입 승인
// 화면(UF-M-01). 이 라운드에는 본보기 디자인 킷이 없어 새로 그린다.
export const SignupApprovalPage = () => {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [requests, setRequests] = useState<SignupRequestItemResponseTypes[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<SignupRequestItemResponseTypes | null>(null);

  // 요청마다 번호를 매겨 마지막 요청의 응답만 화면에 반영한다 — 필터·쪽을 빠르게 바꿀 때 늦게 온 옛 응답이 새 목록을 덮지 않게 한다(F02-04).
  const requestSeq = useRef(0);

  const loadRequests = useCallback(async (nextStatus: string, nextPage: number) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await getSignupRequests(nextStatus, nextPage, PAGE_SIZE);
      if (seq !== requestSeq.current) return;
      setRequests(data.items);
      setPendingCount(data.pendingCount);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      if (seq !== requestSeq.current) return;
      setError(cause instanceof ApiError ? cause.message : "가입 요청 목록을 불러오지 못했습니다");
      setRequests([]);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadRequests(status, page);
    })();
  }, [status, page, loadRequests]);

  // 상태 필터를 바꾸면 0 페이지로 되돌린다 — 옛 필터의 마지막 페이지가 새 필터에서는 범위 밖일 수 있다.
  const handleStatusChange = (nextStatus: string) => {
    setStatus(nextStatus);
    setPage(0);
  };

  const columns: RosterColumn<SignupRequestItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "role", label: "구분", render: (row) => SIGNUP_ROLE_LABEL[row.role] },
    { key: "phone", label: "연락처" },
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
    <StyledSignupApprovalLayout>
      <PageHeader title="가입 승인" description={`처리 대기 ${pendingCount}건`} />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={handleStatusChange} />

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} loading={loading} rows={requests} getRowKey={(row) => row.requestId} />
      </Card>

      <Pagination page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {target ? (
        <SignupDecideDialog
          request={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            loadRequests(status, page);
          }}
        />
      ) : null}
    </StyledSignupApprovalLayout>
  );
};
