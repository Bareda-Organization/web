"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Card, PageHeader, Pagination, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getChangeApprovals } from "../api";
import type { ChangeApprovalSummaryResponseTypes } from "../types";
import { StyledChangeApprovalLayout } from "./ChangeApprovalList.styled";
import { formatClockTime } from "@/shared/lib/format/clockTime";

const DIRECTION_LABEL: Record<ChangeApprovalSummaryResponseTypes["direction"], string> = {
  to_academy: "등원",
  from_academy: "하원",
};

const SOURCE_LABEL: Record<ChangeApprovalSummaryResponseTypes["source"], string> = {
  intent: "예고",
  change_request: "구간 변경 신청",
};

// §9.6 ChangeRequest.status 4종 전부를 필터로 연다. rejected·auto_rejected 조회가 500
// 을 내던 서버 결함은 병합 `ab51f8f`(Ruling 264)로 해소됐다 — 2026-09-12 이 좌석이 자기
// 포트(8081)로 네 값 전부 200 을 재확인했다(보고서 §3). UI 로 가려 두는 이전 판단을 되돌린다.
const STATUS_OPTIONS = [
  { value: "pending", label: "처리 대기" },
  { value: "approved", label: "승인 완료" },
  { value: "rejected", label: "거절" },
  { value: "auto_rejected", label: "자동 거절" },
];

const PAGE_SIZE = 20;

// §5.5 GET /staff/approvals(A-05) 목록 — ②구간 변경 승인 화면(UF-M-02). §1.8 페이징(Ruling 358).
export const ChangeApprovalList = () => {
  const router = useRouter();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<ChangeApprovalSummaryResponseTypes[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApprovals = useCallback(async (nextStatus: string, nextPage: number) => {
    setLoading(true);
    try {
      const data = await getChangeApprovals(nextStatus, nextPage, PAGE_SIZE);
      setItems(data.items);
      setPendingCount(data.pendingCount);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
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
      await loadApprovals(status, page);
    })();
  }, [status, page, loadApprovals]);

  // 상태 필터를 바꾸면 0 페이지로 되돌린다 — 옛 필터의 마지막 페이지가 새 필터에서는
  // 범위 밖일 수 있다(선례 NotificationList#handleFilterChange 와 같은 근거).
  const handleStatusChange = (nextStatus: string) => {
    setStatus(nextStatus);
    setPage(0);
  };

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
    // 상세 화면과 같은 형식 함수를 쓴다 — 목록만 풀 ISO 로 남아 있었다(2026-09-19 실측).
    { key: "deadlineAt", label: "처리 기한", render: (row) => formatClockTime(row.deadlineAt) },
  ];

  return (
    <StyledChangeApprovalLayout>
      <PageHeader title="구간 변경 승인" description={`처리 대기 ${pendingCount}건`} />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={handleStatusChange} />

      <Card padding={0} aria-busy={loading}>
        <RosterTable
          columns={columns}
          loading={loading}
          rows={items}
          getRowKey={(row) => row.approvalId}
          onRowClick={(row) => router.push(`/change-approval/${row.approvalId}`)}
        />
      </Card>

      <Pagination page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />
    </StyledChangeApprovalLayout>
  );
};
