"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Card, Input, PageHeader, Pagination, RosterTable, Select } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getNotifications } from "../api";
import type { NotificationListItemResponseTypes, NotificationType } from "../types";
import { StyledNotificationFilters, StyledNotificationLayout } from "./NotificationList.styled";

const PAGE_SIZE = 20;

// §9.7 21종 라벨 — types/index.ts 의 유니언과 항목 수가 반드시 같아야 한다.
const TYPE_LABEL: Record<NotificationType, string> = {
  boarding: "승차",
  alighting: "하차",
  boarding_canceled: "승차 취소",
  alighting_canceled: "하차 취소",
  no_show: "미승차",
  absent: "미등원",
  arrive: "도착",
  delay: "지연",
  run_started: "운행 시작",
  run_ended: "운행 종료",
  signup_decided: "가입 승인 결정",
  change_decided: "구간 변경 결정",
  approval_requested: "승인 요청",
  intent_changed: "의사 변경",
  route_changed: "노선 변경",
  assignment_changed: "배치 변경",
  no_show_escalated: "미승차 escalation",
  exception_reported: "예외 상황 신고",
  emergency: "비상 알림",
  emergency_canceled: "비상 알림 해제",
};

const TYPE_OPTIONS = [{ value: "", label: "전체 종류" }, ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))];
const ACKED_OPTIONS = [
  { value: "", label: "전체" },
  { value: "false", label: "미확인" },
  { value: "true", label: "확인됨" },
];

// §5.17 GET /staff/notifications(NTF-10·11, A-13) — 알림 로그, 조회 전용.
// 푸시가 off 로 막힌 건도 레코드로 남으므로 이 화면은 "발송 시도 전수" 를 보여준다.
export const NotificationList = () => {
  const [page, setPage] = useState(0);
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [acked, setAcked] = useState("");
  const [items, setItems] = useState<NotificationListItemResponseTypes[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [unackedCount, setUnackedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number, filters: { type: string; date: string; acked: string }) => {
    setLoading(true);
    try {
      const data = await getNotifications(nextPage, PAGE_SIZE, {
        type: filters.type ? (filters.type as NotificationType) : undefined,
        date: filters.date || undefined,
        acked: filters.acked ? filters.acked === "true" : undefined,
      });
      setItems(data.items);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setUnackedCount(data.unackedCount);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "알림 로그를 불러오지 못했습니다");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(page, { type, date, acked });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleFilterChange = (next: { type: string; date: string; acked: string }) => {
    setPage(0);
    load(0, next);
  };

  const columns: RosterColumn<NotificationListItemResponseTypes>[] = [
    { key: "sentAt", label: "발송 시각" },
    { key: "busNo", label: "차량", render: (row) => row.busNo ?? "-" },
    {
      key: "recipient",
      label: "수신자",
      render: (row) => `${row.recipientName} (${row.recipientRole})`,
    },
    { key: "type", label: "종류", render: (row) => TYPE_LABEL[row.type] },
    { key: "body", label: "내용" },
    {
      key: "acked",
      label: "확인",
      render: (row) => <Badge tone={row.acked ? "added" : "amber"}>{row.acked ? "확인됨" : "미확인"}</Badge>,
    },
  ];

  return (
    <StyledNotificationLayout>
      <PageHeader title="알림 로그" description={`총 ${totalCount}건 · 미확인 ${unackedCount}건`} />

      <StyledNotificationFilters>
        <Select
          label="종류"
          value={type}
          options={TYPE_OPTIONS}
          onChange={(event) => {
            setType(event.target.value);
            handleFilterChange({ type: event.target.value, date, acked });
          }}
        />
        <Input
          label="날짜"
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            handleFilterChange({ type, date: event.target.value, acked });
          }}
        />
        <Select
          label="확인 여부"
          value={acked}
          options={ACKED_OPTIONS}
          onChange={(event) => {
            setAcked(event.target.value);
            handleFilterChange({ type, date, acked: event.target.value });
          }}
        />
      </StyledNotificationFilters>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} rows={items} getRowKey={(row) => row.notificationId} />
      </Card>

      <Pagination page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />
    </StyledNotificationLayout>
  );
};
