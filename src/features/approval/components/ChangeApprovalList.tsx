"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Card, PageHeader, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getChangeApprovals } from "../api";
import type { ChangeApprovalSummaryResponseTypes } from "../types";
import { StyledChangeApprovalLayout } from "./ChangeApprovalList.styled";

const DIRECTION_LABEL: Record<ChangeApprovalSummaryResponseTypes["direction"], string> = {
  to_academy: "등원",
  from_academy: "하원",
};

const SOURCE_LABEL: Record<ChangeApprovalSummaryResponseTypes["source"], string> = {
  intent: "예고",
  change_request: "구간 변경 신청",
};

// §5.5 는 `status` 값을 열거하지 않는데, 실제 백엔드가 rejected·auto_rejected·all 에서
// 500 을 낸다(changeApprovals.ts 주석, 2026-09-12 curl 확인) — 그래서 화면 필터는
// pending·approved 둘만 제공해 이 결함 경로를 아예 밟지 않는다(판단 근거, 보고서 §1).
const STATUS_OPTIONS = [
  { value: "pending", label: "처리 대기" },
  { value: "approved", label: "승인 완료" },
];

// §5.5 GET /staff/approvals(A-05) 목록 — ②구간 변경 승인 화면(UF-M-02).
export const ChangeApprovalList = () => {
  const router = useRouter();
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState<ChangeApprovalSummaryResponseTypes[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApprovals = useCallback(async (nextStatus: string) => {
    setLoading(true);
    try {
      const data = await getChangeApprovals(nextStatus);
      setItems(data.items);
      setPendingCount(data.pendingCount);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "구간 변경 목록을 불러오지 못했습니다");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadApprovals(status);
    })();
  }, [status, loadApprovals]);

  const columns: RosterColumn<ChangeApprovalSummaryResponseTypes>[] = [
    { key: "studentName", label: "학생" },
    { key: "source", label: "출처", render: (row) => SOURCE_LABEL[row.source] },
    { key: "busNo", label: "버스" },
    { key: "direction", label: "구간", render: (row) => DIRECTION_LABEL[row.direction] },
    { key: "stopName", label: "승하차지" },
    {
      key: "willRemoveStop",
      label: "승하차지 삭제",
      render: (row) => (row.willRemoveStop ? <Badge tone="removed">삭제 예정</Badge> : "-"),
    },
    { key: "remainingRiders", label: "잔여 인원" },
    { key: "deadlineAt", label: "처리 기한" },
  ];

  return (
    <StyledChangeApprovalLayout>
      <PageHeader title="구간 변경 승인" description={`처리 대기 ${pendingCount}건`} />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} />

      <Card padding={0} aria-busy={loading}>
        <RosterTable
          columns={columns}
          rows={items}
          getRowKey={(row) => row.approvalId}
          onRowClick={(row) => router.push(`/change-approval/${row.approvalId}`)}
        />
      </Card>
    </StyledChangeApprovalLayout>
  );
};
