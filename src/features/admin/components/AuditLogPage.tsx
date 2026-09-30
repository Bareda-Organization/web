"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, EmptyState, Input, PageHeader, RosterTable, SegmentedControl } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAuditLogs, getLoginHistory } from "../api";
import type { AuditLogItemResponseTypes, LoginHistoryItemResponseTypes } from "../types";
import { StyledAuditLogLayout, StyledFilterField, StyledFilterRow } from "./AuditLogPage.styled";
import { formatDateTime, todayInSeoul } from "@/shared/lib/format/dateTime";

const TAB_OPTIONS = [
  { value: "audit", label: "감사 로그" },
  { value: "login", label: "접속 이력" },
];

const ACTION_LABEL: Record<AuditLogItemResponseTypes["action"], string> = {
  read: "조회",
  update: "수정",
  delete: "삭제",
};

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

  const [auditItems, setAuditItems] = useState<AuditLogItemResponseTypes[]>([]);
  const [loginItems, setLoginItems] = useState<LoginHistoryItemResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback(
    () => ({
      academyId: academyId || undefined,
      accountId: accountId || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [academyId, accountId, from, to],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildQuery();
      if (tab === "audit") {
        const data = await getAuditLogs(query);
        setAuditItems(data.items);
      } else {
        const data = await getLoginHistory(query);
        setLoginItems(data.items);
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "이력을 불러오지 못했습니다");
      setAuditItems([]);
      setLoginItems([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, tab]);

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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
      render: (row) => <Badge tone={row.result === "success" ? "added" : "red"}>{row.result === "success" ? "성공" : "실패"}</Badge>,
    },
    { key: "ip", label: "IP" },
    {
      key: "blockEvent",
      label: "차단 발생",
      render: (row) => (row.blockEvent ? <Badge tone="amber">차단됨</Badge> : "-"),
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
        <Button variant="primary" onClick={load}>
          조회
        </Button>
      </StyledFilterRow>

      <Card padding={0} aria-busy={loading}>
        {tab === "audit" ? (
          auditItems.length === 0 && !loading ? (
            <EmptyState icon="file-search" title="조건에 맞는 감사 로그가 없습니다" />
          ) : (
            <RosterTable columns={auditColumns} loading={loading} rows={auditItems} getRowKey={(row, index) => `${row.targetType}-${row.targetId}-${index}`} />
          )
        ) : loginItems.length === 0 && !loading ? (
          <EmptyState icon="file-search" title="조건에 맞는 접속 이력이 없습니다" />
        ) : (
          <RosterTable columns={loginColumns} loading={loading} rows={loginItems} getRowKey={(row, index) => `${row.accountId}-${index}`} />
        )}
      </Card>
    </StyledAuditLogLayout>
  );
};
