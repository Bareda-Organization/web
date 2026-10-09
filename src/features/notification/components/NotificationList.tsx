"use client";

import { useEffect, useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Card, FilterBar, Input, PageHeader, Pagination, RosterTable, Select, StatusChip, Switch, Tabs } from "@/shared/ui";
import type { StatusChipTone } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAckedNotificationCount, getNotifications } from "../api";
import { isAckTracked } from "../lib/ackTracked";
import type { NotificationListItemResponseTypes, NotificationType } from "../types";
import { StyledNotificationLayout, StyledNotificationFooter, StyledRecipientCell } from "./NotificationList.styled";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { formatHeaderDate, todayInSeoul } from "@/shared/lib/format/dateTime";
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
  no_show_escalated: "미승차 무응답(대기 시간 경과)",
  exception_reported: "예외 상황 신고",
  emergency: "비상 알림",
  emergency_canceled: "비상 알림 해제",
};

// 수신자가 학원 관계자·메인 관리자인 역할(§2.2) — 이 알림의 "수신자 확인" 이 관계자 본인의 확인이다.
const STAFF_ROLES = new Set(["staff", "system_admin"]);

const TYPE_OPTIONS = [{ value: "", label: "전체 종류" }, ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))];
// 종류 칩의 색 — 위험(비상 · 미승차) · 주의(지연) · 정보(승인 계열)만 눈에 띄게, 나머지는 조용한 회색. 모양이 함께 붙어 색만으로 말하지 않는다.
const TYPE_TONE: Partial<Record<NotificationType, StatusChipTone>> = {
  emergency: "bad",
  emergency_canceled: "off",
  no_show: "bad",
  no_show_escalated: "bad",
  delay: "warn",
  approval_requested: "info",
  signup_decided: "info",
  change_decided: "info",
};

// 날짜 묶음 줄 — "오늘 · 10월 3일 (토)" · "어제 · 10월 2일 (금)".
const dayKey = (sentAt: string): string => {
  const parsed = new Date(sentAt);
  return Number.isNaN(parsed.getTime()) ? "-" : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(parsed);
};
const dayHeading = (key: string): string => {
  if (key === "-") return "날짜 미상";
  const today = todayInSeoul();
  const yesterday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(Date.parse(`${today}T12:00:00+09:00`) - 86_400_000));
  const label = formatHeaderDate(new Date(`${key}T12:00:00+09:00`));
  return key === today ? `오늘 · ${label}` : key === yesterday ? `어제 · ${label}` : label;
};

// 수신자 확인 칸 — 묶음은 "미확인 2/2" · "확인 14/20" · "확인됨", 낱개는 "미확인" · "확인됨".
// 확인을 추적하지 않는 종류(중요 통지 3종 밖 — Ruling 850)는 경고색 없이 "확인 대상 아님" 이다.
const ackSummary = (row: NotificationListItemResponseTypes): { label: string; tone: StatusChipTone; quiet: boolean } => {
  if (!isAckTracked(row.type)) return { label: "확인 대상 아님", tone: "off", quiet: true };
  if (row.recipientCount === undefined) return row.acked ? { label: "확인됨", tone: "ok", quiet: true } : { label: "미확인", tone: "warn", quiet: false };
  const acked = row.ackedCount ?? 0;
  if (acked >= row.recipientCount) return { label: "확인됨", tone: "ok", quiet: true };
  if (acked === 0) return { label: `미확인 ${row.recipientCount}/${row.recipientCount}`, tone: "warn", quiet: false };
  return { label: `확인 ${acked}/${row.recipientCount}`, tone: "ok", quiet: true };
};

// §5.17 GET /staff/notifications(NTF-10·11, A-13) — 알림 로그, 조회 전용.
// 푸시가 off 로 막힌 건도 레코드로 남으므로 이 화면은 "발송 시도 전수" 를 보여준다.
export const NotificationList = () => {
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  // 탭 = 수신자 확인 여부("" 전체 · false 미확인 · true 확인됨). 묶어 보기는 기본 켬, 관계자 알림만은 기본 끔.
  const [acked, setAcked] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [staffOnly, setStaffOnly] = useState(false);
  // 필터가 바뀌면 0쪽부터 다시 읽는다 — 쪽 번호와 필터를 한 곳(usePagedList)에서 다뤄 요청이 한 번만 나가고,
  // 늦게 온 옛 응답은 무시하며, 조회가 실패해도 보이던 목록은 그대로 둔다.
  const { items, data, totalCount, hasNext, page, setPage, loading, error, reload } = usePagedList(
    (targetPage) =>
      getNotifications(targetPage, PAGE_SIZE, {
        type: type ? (type as NotificationType) : undefined,
        date: date || undefined,
        acked: acked ? acked === "true" : undefined,
        group: grouped,
        recipientRole: staffOnly ? "staff" : undefined,
      }),
    { resetKey: `${type}|${date}|${acked}|${grouped}|${staffOnly}`, errorMessage: "알림 로그를 불러오지 못했습니다" },
  );
  const unackedCount = data?.unackedCount ?? 0;

  // "수신자 확인됨" 탭 건수 — 서버가 acked=true 로 센 값. 목록과 별개 조회라 실패해도 목록은 그대로 두고 그 탭의 건수만 뺀다.
  // 결과에 센 필터의 열쇠를 붙여 둔다 — 필터가 바뀐 직후 옛 건수를 보이지 않고(열쇠가 다르면 비움), 효과 안에서 비우는 setState 도 필요 없다.
  const ackedKey = `${type}|${date}|${grouped}|${staffOnly}`;
  const [ackedResult, setAckedResult] = useState<{ key: string; count: number } | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    getAckedNotificationCount({ type: type ? (type as NotificationType) : undefined, date: date || undefined, group: grouped, recipientRole: staffOnly ? "staff" : undefined })
      .then((count) => !cancelled && setAckedResult({ key: ackedKey, count }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [type, date, grouped, staffOnly, ackedKey]);
  const ackedTotal = ackedResult?.key === ackedKey ? ackedResult.count : undefined;

  const columns: RosterColumn<NotificationListItemResponseTypes>[] = [
    { key: "sentAt", label: "발송", render: (row) => <b>{formatClockTime(row.sentAt)}</b> },
    { key: "busNo", label: "차량", render: (row) => row.busNo ?? "-" },
    {
      key: "recipient",
      label: "수신자",
      render: (row) => {
        const others = (row.recipientCount ?? 1) - 1;
        return (
          <StyledRecipientCell>
            <span>
              <b>{row.recipientName}</b>
              {others > 0 ? <b> 외 {others}명</b> : null} <small>{formatRole(row.recipientRole)}</small>
            </span>
            {/* 학부모·동승자에게 간 알림의 "수신자 확인" 은 그 수신자의 일이고, 관계자에게 간 알림만 학원이 직접 확인한다. */}
            {STAFF_ROLES.has(row.recipientRole) ? (
              <StatusChip tone="info" marker={false}>
                관계자 알림
              </StatusChip>
            ) : null}
          </StyledRecipientCell>
        );
      },
    },
    { key: "type", label: "종류", render: (row) => <StatusChip tone={TYPE_TONE[row.type] ?? "off"} marker={false}>{TYPE_LABEL[row.type]}</StatusChip> },
    { key: "body", label: "내용" },
    {
      key: "acked",
      label: "수신자 확인",
      render: (row) => {
        const summary = ackSummary(row);
        return (
          <StatusChip tone={summary.tone} marker={false} quiet={summary.quiet}>
            {summary.label}
          </StatusChip>
        );
      },
    },
  ];

  return (
    <StyledNotificationLayout>
      <PageHeader
        title="알림 로그"
        description={error ? undefined : `총 ${totalCount}건 · 수신자 미확인 ${unackedCount}건 — 푸시를 꺼 둔 수신자에게 막힌 알림도 기록으로 남습니다`}
      />

      <Tabs
        aria-label="수신자 확인 여부"
        items={[
          { value: "", label: "전체", count: totalCount },
          { value: "false", label: "수신자 미확인", count: unackedCount },
          { value: "true", label: "수신자 확인됨", count: ackedTotal },
        ]}
        value={acked}
        onChange={setAcked}
      />

      <FilterBar>
        <Select label="종류" value={type} options={TYPE_OPTIONS} onChange={(event) => setType(event.target.value)} />
        <Input label="날짜" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Switch label="같은 알림 묶어 보기" checked={grouped} onChange={(event) => setGrouped(event.target.checked)} />
        <Switch label="관계자에게 온 알림만" checked={staffOnly} onChange={(event) => setStaffOnly(event.target.checked)} />
      </FilterBar>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card flush aria-busy={loading}>
        <RosterTable
          hasError={Boolean(error)}
          onRetry={reload}
          columns={columns}
          loading={loading}
          rows={items}
          getRowKey={(row) => row.notificationId}
          groupBy={(row) => dayKey(row.sentAt)}
          renderGroupLabel={(key) => <b>{dayHeading(key)}</b>}
          rowTone={(row) => (isAckTracked(row.type) && STAFF_ROLES.has(row.recipientRole) && !row.acked ? "warn" : undefined)}
        />
        <StyledNotificationFooter>
          <span>{grouped ? "같은 알림의 수신자는 한 줄로 묶었습니다 · " : ""}수신 확인은 지연 · 미승차 · 노선 변경 알림만 추적합니다(&apos;미승차 무응답&apos; 알림은 확인 대상이 아닙니다) · 최근 발송이 위</span>
          <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />
        </StyledNotificationFooter>
      </Card>
    </StyledNotificationLayout>
  );
};
