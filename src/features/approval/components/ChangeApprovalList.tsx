"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, EmptyState, PageHeader, Pagination, RosterTable, StatusChip, Tabs } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getChangeApprovals } from "../api";
import type { ChangeApprovalSummaryResponseTypes } from "../types";
import { StyledChangeApprovalLayout } from "./ChangeApprovalList.styled";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { formatRemaining, useNowEverySecond } from "../lib/remainingTime";
import { StyledChangeFooter, StyledGroupHead, StyledSubText } from "./ChangeApprovalList.styled";

const DIRECTION_LABEL: Record<ChangeApprovalSummaryResponseTypes["direction"], string> = {
  to_academy: "등원",
  from_academy: "하원",
};

const SOURCE_LABEL: Record<ChangeApprovalSummaryResponseTypes["source"], string> = {
  intent: "예고",
  change_request: "구간 변경 신청",
};

// §9.6 ChangeRequest.status 4종 전부를 탭으로 연다(처리 대기만 건수를 단다 — 나머지는 전 기간이라 건수를 모른다).
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

  // 요청마다 번호를 매겨 마지막 요청의 응답만 화면에 반영한다 — 필터·쪽을 빠르게 바꿀 때 늦게 온 옛 응답이 새 목록을 덮지 않게 한다(F02-04).
  const requestSeq = useRef(0);

  const loadApprovals = useCallback(async (nextStatus: string, nextPage: number) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await getChangeApprovals(nextStatus, nextPage, PAGE_SIZE);
      if (seq !== requestSeq.current) return;
      setItems(data.items);
      setPendingCount(data.pendingCount);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      if (seq !== requestSeq.current) return;
      setError(cause instanceof ApiError ? cause.message : "구간 변경 목록을 불러오지 못했습니다");
      setItems([]);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
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

  const now = useNowEverySecond();

  const columns: RosterColumn<ChangeApprovalSummaryResponseTypes>[] = [
    {
      key: "studentName",
      label: "학생",
      render: (row) => (
        <>
          <b>{row.studentName}</b>
          <StyledSubText>
            {SOURCE_LABEL[row.source]} · 접수 {formatClockTime(row.requestedAt)}
          </StyledSubText>
        </>
      ),
    },
    {
      key: "stopName",
      label: "승하차지",
      render: (row) => (
        <>
          {row.stopName}
          {row.willRemoveStop ? (
            <>
              {" "}
              <StatusChip tone="bad">삭제 예정</StatusChip>
              <StyledSubText>승인하면 노선에서 빠짐</StyledSubText>
            </>
          ) : null}
        </>
      ),
    },
    { key: "remainingRiders", label: "잔여 인원", align: "right", render: (row) => `${row.remainingRiders}명` },
    // 상세 화면과 같은 형식 함수를 쓴다 — 목록만 풀 ISO 로 남아 있었다(2026-09-19 실측).
    { key: "deadlineAt", label: "처리 기한", render: (row) => formatClockTime(row.deadlineAt) },
    // 기한을 넘기면 자동 거절되어 학부모에게 실패 통지가 나간다 — 처리 대기 목록에서는 남은 시간을 함께 보여 준다(B1 #5).
    ...(status === "pending"
      ? [
          {
            key: "autoRejectIn",
            label: "자동 거절까지",
            render: (row: ChangeApprovalSummaryResponseTypes) => {
              const remaining = formatRemaining(Date.parse(row.deadlineAt), now);
              return <StatusChip tone="warn" marker={false}>{remaining ? `${remaining} 남음` : "기한 지남"}</StatusChip>;
            },
          },
        ]
      : []),
    {
      key: "detail",
      label: "상세",
      align: "right",
      render: (row) => (
        <Button variant="secondary" size="sm" icon="arrow-right" aria-label={`${row.studentName} 전·후 노선 보기`} onClick={() => router.push(`/change-approval/${row.approvalId}`)}>
          전 · 후 노선 보기
        </Button>
      ),
    },
  ];

  // 승인 기한은 회차 단위라 같은 회차의 요청을 한 묶음으로 둔다 — 마감이 빠른 회차가 위(서버 정렬: 마감 임박 순).
  const runGroupKey = (row: ChangeApprovalSummaryResponseTypes) => row.runId;
  const soonest = status === "pending" ? items[0] : undefined;
  const soonestRunItems = soonest ? items.filter((row) => row.runId === soonest.runId) : [];
  const soonestRemaining = soonest ? formatRemaining(Date.parse(soonest.deadlineAt), now) : null;
  const isEmpty = !loading && !error && items.length === 0;

  return (
    <StyledChangeApprovalLayout>
      <PageHeader
        title="구간 변경 승인"
        description={error ? undefined : `처리 대기 ${pendingCount}건 · 출발 30분 안쪽에 들어온 탑승 변경 — 출발 시각까지 처리하지 않으면 자동 거절됩니다`}
      />

      {soonest ? (
        <AlertBanner
          tone="moving"
          title={`${soonest.busNo} · ${DIRECTION_LABEL[soonest.direction]} ${formatClockTime(soonest.deadlineAt)} 출발 — ${soonestRemaining ? `${soonestRemaining} 안에 ` : ""}처리하지 않으면 ${soonestRunItems.length}건이 자동 거절됩니다`}
        >
          자동 거절되면 기존 노선이 유지되고 학부모에게 실패가 통지됩니다. 한 건씩 열어 전 · 후 노선을 확인한 뒤 결정하세요.
        </AlertBanner>
      ) : null}

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Tabs
        aria-label="처리 상태"
        items={[
          { value: "pending", label: "처리 대기", count: pendingCount },
          { value: "approved", label: "승인 완료" },
          { value: "rejected", label: "거절" },
          { value: "auto_rejected", label: "자동 거절" },
        ]}
        value={status}
        onChange={handleStatusChange}
      />

      <Card flush aria-busy={loading}>
        {isEmpty ? (
          <EmptyState icon="route" title={status === "pending" ? "처리 대기 중인 구간 변경이 없습니다" : "이 상태의 구간 변경이 없습니다"} />
        ) : (
          <RosterTable
            hasError={Boolean(error)}
            onRetry={() => loadApprovals(status, page)}
            columns={columns}
            loading={loading}
            rows={items}
            getRowKey={(row) => row.approvalId}
            groupBy={runGroupKey}
            renderGroupLabel={(_key, rows) => (
              <StyledGroupHead>
                <b>
                  {rows[0].busNo} · {DIRECTION_LABEL[rows[0].direction]}
                </b>
                <span>
                  {formatClockTime(rows[0].deadlineAt)} 출발 · {status === "pending" ? "대기" : "건수"} {rows.length}건
                </span>
              </StyledGroupHead>
            )}
            rowTone={(row) => (row.willRemoveStop && status === "pending" ? "warn" : undefined)}
          />
        )}
        <StyledChangeFooter>
          <span>{status === "pending" ? "마감이 빠른 순" : "최근 결정 순"}</span>
          <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />
        </StyledChangeFooter>
      </Card>
    </StyledChangeApprovalLayout>
  );
};
