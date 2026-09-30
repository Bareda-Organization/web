"use client";

import { useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Badge, Button, Card, EmptyState, Input, PageHeader, Pagination, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAuditLogs, getLoginHistory } from "../api";
import type {
  AuditLogItemResponseTypes,
  AuditLogsResponseTypes,
  LoginHistoryItemResponseTypes,
  LoginHistoryResponseTypes,
} from "../types";
import { StyledAuditLogLayout, StyledFilterField, StyledFilterRow } from "./AuditLogPage.styled";
import { formatDateTime, todayInSeoul } from "@/shared/lib/format/dateTime";

const PAGE_SIZE = 20;

const TAB_OPTIONS = [
  { value: "audit", label: "감사 로그" },
  { value: "login", label: "접속 이력" },
];

const ACTION_LABEL: Record<AuditLogItemResponseTypes["action"], string> = {
  read: "조회",
  update: "수정",
  delete: "삭제",
};

const BLOCK_ACTION_LABEL = { block: "차단", unblock: "해제" } as const;

// §6.13 감사·접속 이력(O-04). BRIEF-a1.md §4.3 — "전부 보여주는 것이 기본값이 아니다".
// 이 화면은 §1.12 가 마스킹하는 필드(보호자 연락처 등)를 응답에 아예 담지 않지만, 대신
// 계정별 로그인 IP·시각 전체를 무제한으로 펼쳐 보이는 것 자체가 노출 범위 문제라
// 판단했다(판단 근거, 보고서 §1) — 그래서 기본 조회 범위를 "오늘" 로 좁히고,
// 전체 기간을 보려면 명시적으로 날짜를 지운 뒤 검색해야 한다.
export const AuditLogPage = () => {
  const [tab, setTab] = useState<"audit" | "login">("audit");
  const [academyId, setAcademyId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState(todayInSeoul());
  const [to, setTo] = useState("");

  // 조회 조건은 [조회] 를 눌러야 적용된다 — 입력 중인 값과 서버에 보내는 값(applied)을 나눈다.
  const [applied, setApplied] = useState({ academyId: "", accountId: "", from: todayInSeoul(), to: "" });
  const query = {
    academyId: applied.academyId || undefined,
    accountId: applied.accountId || undefined,
    from: applied.from || undefined,
    to: applied.to || undefined,
  };
  const paging = usePagedList<AuditLogsResponseTypes | LoginHistoryResponseTypes>(
    (page) => (tab === "audit" ? getAuditLogs({ ...query, page, size: PAGE_SIZE }) : getLoginHistory({ ...query, page, size: PAGE_SIZE })),
    { resetKey: `${tab}|${JSON.stringify(applied)}`, errorMessage: "이력을 불러오지 못했습니다" },
  );
  const { loading, error } = paging;
  const auditItems = tab === "audit" ? (paging.items as AuditLogItemResponseTypes[]) : [];
  const loginItems = tab === "login" ? (paging.items as LoginHistoryItemResponseTypes[]) : [];

  const auditColumns: RosterColumn<AuditLogItemResponseTypes>[] = [
    { key: "occurredAt", label: "시각", render: (row) => formatDateTime(row.occurredAt) },
    { key: "actor", label: "행위자" },
    { key: "action", label: "동작", render: (row) => ACTION_LABEL[row.action] },
    { key: "targetType", label: "대상 종류" },
    { key: "targetId", label: "대상 ID" },
    { key: "academyName", label: "학원", render: (row) => row.academyName ?? "-" },
  ];

  const loginColumns: RosterColumn<LoginHistoryItemResponseTypes>[] = [
    { key: "occurredAt", label: "시각", render: (row) => formatDateTime(row.occurredAt) },
    { key: "loginId", label: "아이디" },
    {
      key: "result",
      label: "결과",
      render: (row) =>
        row.result === null ? "-" : <Badge tone={row.result === "success" ? "added" : "red"}>{row.result === "success" ? "성공" : "실패"}</Badge>,
    },
    { key: "ip", label: "IP" },
    {
      key: "blockEvent",
      // block_event 는 차단 행과 해제 행 양쪽에 붙는다(§6.13, BR-219) — block_action 이 둘을 가른다(Ruling 394).
      label: "차단·해제 이벤트",
      render: (row) => (row.blockAction ? <Badge tone={row.blockAction === "block" ? "red" : "added"}>{BLOCK_ACTION_LABEL[row.blockAction]}</Badge> : "-"),
    },
  ];

  return (
    <StyledAuditLogLayout>
      <PageHeader title="감사 · 접속 이력" description="시스템 조작·로그인 이력을 조회합니다" />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={(value) => setTab(value as "audit" | "login")} />

      <StyledFilterRow>
        <StyledFilterField>
          <Input label="학원 ID" placeholder="선택" value={academyId} onChange={(event) => setAcademyId(event.target.value)} />
        </StyledFilterField>
        <StyledFilterField>
          <Input label="계정 ID" placeholder="선택" value={accountId} onChange={(event) => setAccountId(event.target.value)} />
        </StyledFilterField>
        <StyledFilterField>
          <Input label="시작일" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </StyledFilterField>
        <StyledFilterField>
          <Input label="종료일" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </StyledFilterField>
        <Button variant="secondary" onClick={() => setFrom("")}>
          전체 기간 보기
        </Button>
        <Button variant="primary" onClick={() => setApplied({ academyId, accountId, from, to })}>
          조회
        </Button>
      </StyledFilterRow>

      <Card padding={0} aria-busy={loading}>
        {tab === "audit" ? (
          auditItems.length === 0 && !loading && !error ? (
            <EmptyState icon="file-search" title="조건에 맞는 감사 로그가 없습니다" />
          ) : (
            <RosterTable columns={auditColumns} loading={loading} rows={auditItems} getRowKey={(row, index) => `${row.targetType}-${row.targetId}-${index}`} />
          )
        ) : loginItems.length === 0 && !loading && !error ? (
          <EmptyState icon="file-search" title="조건에 맞는 접속 이력이 없습니다" />
        ) : (
          <RosterTable columns={loginColumns} loading={loading} rows={loginItems} getRowKey={(row, index) => `${row.accountId}-${index}`} />
        )}
      </Card>

      <Pagination page={paging.page} size={PAGE_SIZE} totalCount={paging.totalCount} hasNext={paging.hasNext} onPageChange={paging.setPage} />
    </StyledAuditLogLayout>
  );
};
