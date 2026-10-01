"use client";

import { useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Badge, Card, Input, PageHeader, Pagination, RosterTable, Select } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getNotifications } from "../api";
import type { NotificationListItemResponseTypes, NotificationType } from "../types";
import { StyledNotificationFilters, StyledNotificationLayout, StyledStaffRecipientMark } from "./NotificationList.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { formatRole } from "@/shared/lib/format/roleLabel";

const PAGE_SIZE = 20;

// §9.7 20종 라벨 — types/index.ts 의 유니언과 항목 수가 반드시 같아야 한다.
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
  no_show_escalated: "미승차 무응답(3분 경과)",
  exception_reported: "예외 상황 신고",
  emergency: "비상 알림",
  emergency_canceled: "비상 알림 해제",
};

// 수신자가 학원 관계자·메인 관리자인 역할(§2.2) — 이 알림의 "수신자 확인" 이 관계자 본인의 확인이다.
const STAFF_ROLES = new Set(["staff", "system_admin"]);

const TYPE_OPTIONS = [{ value: "", label: "전체 종류" }, ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))];
const ACKED_OPTIONS = [
  { value: "", label: "전체" },
  { value: "false", label: "미확인" },
  { value: "true", label: "확인됨" },
];

// §5.17 GET /staff/notifications(NTF-10·11, A-13) — 알림 로그, 조회 전용.
// 푸시가 off 로 막힌 건도 레코드로 남으므로 이 화면은 "발송 시도 전수" 를 보여준다.
export const NotificationList = () => {
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [acked, setAcked] = useState("");
  // 필터가 바뀌면 0쪽부터 다시 읽는다 — 쪽 번호와 필터를 한 곳(usePagedList)에서 다뤄 요청이 한 번만 나가고,
  // 늦게 온 옛 응답은 무시하며, 조회가 실패해도 보이던 목록은 그대로 둔다.
  const { items, data, totalCount, hasNext, page, setPage, loading, error, reload } = usePagedList(
    (targetPage) =>
      getNotifications(targetPage, PAGE_SIZE, {
        type: type ? (type as NotificationType) : undefined,
        date: date || undefined,
        acked: acked ? acked === "true" : undefined,
      }),
    { resetKey: `${type}|${date}|${acked}`, errorMessage: "알림 로그를 불러오지 못했습니다" },
  );
  const unackedCount = data?.unackedCount ?? 0;

  const columns: RosterColumn<NotificationListItemResponseTypes>[] = [
    { key: "sentAt", label: "발송 시각", render: (row) => formatDateTime(row.sentAt) },
    { key: "busNo", label: "차량", render: (row) => row.busNo ?? "-" },
    {
      key: "recipient",
      label: "수신자",
      render: (row) => (
        <>
          {`${row.recipientName} (${formatRole(row.recipientRole)})`}
          {/* 학부모·동승자에게 간 알림의 "수신자 확인" 은 그 수신자의 일이고, 관계자에게 간 알림만 학원이 직접 확인한다. */}
          {STAFF_ROLES.has(row.recipientRole) ? (
            <StyledStaffRecipientMark>
              <Badge tone="brand">관계자 알림</Badge>
            </StyledStaffRecipientMark>
          ) : null}
        </>
      ),
    },
    { key: "type", label: "종류", render: (row) => TYPE_LABEL[row.type] },
    { key: "body", label: "내용" },
    {
      key: "acked",
      label: "수신자 확인",
      render: (row) => <Badge tone={row.acked ? "added" : "amber"}>{row.acked ? "확인됨" : "미확인"}</Badge>,
    },
  ];

  return (
    <StyledNotificationLayout>
      <PageHeader title="알림 로그" description={`총 ${totalCount}건 · 수신자 미확인 ${unackedCount}건`} />

      <StyledNotificationFilters>
        <Select
          label="종류"
          value={type}
          options={TYPE_OPTIONS}
          onChange={(event) => setType(event.target.value)}
        />
        <Input
          label="날짜"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Select
          label="수신자 확인 여부"
          value={acked}
          options={ACKED_OPTIONS}
          onChange={(event) => setAcked(event.target.value)}
        />
      </StyledNotificationFilters>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable hasError={Boolean(error)} onRetry={reload} columns={columns} loading={loading} rows={items} getRowKey={(row) => row.notificationId} />
      </Card>

      <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />
    </StyledNotificationLayout>
  );
};
