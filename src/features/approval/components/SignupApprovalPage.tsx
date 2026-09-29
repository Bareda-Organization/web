"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, PageHeader, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getSignupRequests } from "../api";
import { SIGNUP_ROLE_LABEL } from "../lib/signupRoleLabel";
import type { SignupRequestItemResponseTypes } from "../types";
import { SignupDecideDialog } from "./SignupDecideDialog";
import { StyledSignupApprovalLayout } from "./SignupApprovalPage.styled";

// §5.1 은 `status` 값 목록을 열거하지 않고 "기본값 pending" 만 명시한다. §5.2 응답의
// `account_status`(`active`|`rejected`) 를 근거로 나머지 두 값을 추정해 필터로 뒀다
// (판단 근거, 보고서 §1) — ChangeApproval 의 `status=all` 500 결함(changeApprovals.ts
// 주석)과 같은 함정을 피하려고 "전체" 옵션은 넣지 않는다.
const STATUS_OPTIONS = [
  { value: "pending", label: "처리 대기" },
  { value: "active", label: "승인 완료" },
  { value: "rejected", label: "거절됨" },
];

// §5.1 GET /staff/signup-requests(A-02) · §5.2 POST .../decide(A-02) — 가입 승인
// 화면(UF-M-01). 이 라운드에는 본보기 디자인 킷이 없어 새로 그린다.
export const SignupApprovalPage = () => {
  const [status, setStatus] = useState("pending");
  const [requests, setRequests] = useState<SignupRequestItemResponseTypes[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<SignupRequestItemResponseTypes | null>(null);

  const loadRequests = useCallback(async (nextStatus: string) => {
    setLoading(true);
    try {
      const data = await getSignupRequests(nextStatus);
      setRequests(data.items);
      setPendingCount(data.pendingCount);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "가입 요청 목록을 불러오지 못했습니다");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadRequests(status);
    })();
  }, [status, loadRequests]);

  const columns: RosterColumn<SignupRequestItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "role", label: "구분", render: (row) => SIGNUP_ROLE_LABEL[row.role] },
    { key: "phone", label: "연락처" },
    { key: "requestedAt", label: "신청 일시" },
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

      <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} rows={requests} getRowKey={(row) => row.requestId} />
      </Card>

      {target ? (
        <SignupDecideDialog
          request={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            loadRequests(status);
          }}
        />
      ) : null}
    </StyledSignupApprovalLayout>
  );
};
