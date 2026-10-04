"use client";

import { useEffect, useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Button, Card, EmptyState, Input, PageHeader, Pagination, RosterTable, SearchField, SegmentedControl, Select, StatusChip, Tabs } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAllAcademies, getAuditActors, getAuditLogs, getLoginHistory } from "../api";
import type {
  AcademySummaryResponseTypes,
  AuditAction,
  AuditActorResponseTypes,
  AuditLogItemResponseTypes,
  AuditLogsResponseTypes,
  LoginHistoryItemResponseTypes,
  LoginHistoryResponseTypes,
} from "../types";
import {
  StyledActorSearchBox,
  StyledActorSearchField,
  StyledAuditLogLayout,
  StyledCellDot,
  StyledFieldLabel,
  StyledFilterField,
  StyledFilterHint,
  StyledFilterPanel,
  StyledFilterRow,
  StyledTwoLine,
} from "./AuditLogPage.styled";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { periodRange, stampText, targetText } from "../lib/auditView";
import type { AuditPeriod } from "../lib/auditView";
import { academyDotColor } from "../lib/relativeTime";

const PAGE_SIZE = 20;

const TAB_OPTIONS = [
  { value: "audit", label: "감사 로그" },
  { value: "login", label: "접속 이력" },
];

const PERIOD_OPTIONS = [
  { value: "today", label: "오늘" },
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "custom", label: "직접 입력" },
];

const ACTION_LABEL: Record<AuditLogItemResponseTypes["action"], string> = {
  read: "조회",
  update: "수정",
  delete: "삭제",
};

// 동작 필터의 선택지 — 빈 값은 "거르지 않음"(서버도 action 을 안 받으면 셋 다 돌려준다).
const ACTION_FILTER_OPTIONS = [
  { value: "", label: "전체" },
  { value: "read", label: ACTION_LABEL.read },
  { value: "update", label: ACTION_LABEL.update },
  { value: "delete", label: ACTION_LABEL.delete },
];

const BLOCK_ACTION_LABEL = { block: "차단", unblock: "해제" } as const;

// 서버는 시작일(`from`)을 안 주면 종료일(없으면 지금)로부터 30일 전부터만 돌려준다(Ruling 632, `API_SPEC §6.13`) — 시작일을 비워도
// 전체 기간이 아니다. 더 오래된 이력은 시작일을 직접 골라야 한다(R46-FIXCONN).
const FROM_HINT = "시작일을 비우면 종료일(없으면 지금)부터 최근 30일만 조회합니다";

// §6.13 감사·접속 이력(O-04). BRIEF-a1.md §4.3 — "전부 보여주는 것이 기본값이 아니다".
// 이 화면은 §1.12 가 마스킹하는 필드(보호자 연락처 등)를 응답에 아예 담지 않지만, 대신
// 계정별 로그인 IP·시각 전체를 무제한으로 펼쳐 보이는 것 자체가 노출 범위 문제라
// 판단했다(판단 근거, 보고서 §1) — 그래서 기본 조회 범위를 "오늘" 로 좁히고,
// 전체 기간을 보려면 명시적으로 날짜를 지운 뒤 검색해야 한다.
export const AuditLogPage = () => {
  const [tab, setTab] = useState<"audit" | "login">("audit");
  const [academyId, setAcademyId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [action, setAction] = useState("");
  const [academies, setAcademies] = useState<AcademySummaryResponseTypes[]>([]);
  const [actorQuery, setActorQuery] = useState("");
  const [actors, setActors] = useState<AuditActorResponseTypes[]>([]);
  const [actorSearched, setActorSearched] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [from, setFrom] = useState(todayInSeoul());
  const [to, setTo] = useState("");
  const [period, setPeriod] = useState<AuditPeriod>("today");

  // 조회 조건은 [조회] 를 눌러야 적용된다 — 입력 중인 값과 서버에 보내는 값(applied)을 나눈다.
  const [applied, setApplied] = useState({ academyId: "", accountId: "", action: "", from: todayInSeoul(), to: "" });
  const query = {
    academyId: applied.academyId || undefined,
    accountId: applied.accountId || undefined,
    from: applied.from || undefined,
    to: applied.to || undefined,
  };
  // 동작은 감사 로그 탭만 고른다 — 접속 이력에는 조회·수정·삭제가 없다(Ruling 446).
  const auditQuery = { ...query, action: (applied.action || undefined) as AuditAction | undefined };
  const paging = usePagedList<AuditLogsResponseTypes | LoginHistoryResponseTypes>(
    (page) => (tab === "audit" ? getAuditLogs({ ...auditQuery, page, size: PAGE_SIZE }) : getLoginHistory({ ...query, page, size: PAGE_SIZE })),
    { resetKey: `${tab}|${JSON.stringify(applied)}`, errorMessage: "이력을 불러오지 못했습니다" },
  );
  const { loading, error } = paging;

  // 학원 선택 목록은 첫 쪽(20건)이 아니라 전부 — 21번째 이후 학원의 이력도 걸러 볼 수 있어야 한다.
  useEffect(() => {
    let cancelled = false;
    getAllAcademies()
      .then((items) => {
        if (!cancelled) setAcademies(items);
      })
      .catch(() => {
        if (!cancelled) setFilterError("학원 목록을 불러오지 못했습니다");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchActors = async (keyword: string) => {
    const q = keyword.trim();
    setAccountId("");
    setFilterError(null);
    if (!q) {
      setActors([]);
      setActorSearched(false);
      return;
    }
    try {
      setActors(await getAuditActors(q));
      setActorSearched(true);
    } catch {
      setFilterError("행위자를 찾지 못했습니다");
    }
  };
  const auditItems = tab === "audit" ? (paging.items as AuditLogItemResponseTypes[]) : [];
  const loginItems = tab === "login" ? (paging.items as LoginHistoryItemResponseTypes[]) : [];

  const auditColumns: RosterColumn<AuditLogItemResponseTypes>[] = [
    { key: "occurredAt", label: "시각", render: (row) => stampText(row.occurredAt) },
    {
      key: "actor",
      label: "행위자",
      render: (row) => (
        <StyledTwoLine>
          <b>{row.actorName ?? row.actor}</b>
          {row.actorName ? <small>{row.actor}</small> : null}
        </StyledTwoLine>
      ),
    },
    {
      key: "action",
      label: "동작",
      render: (row) => (
        <StatusChip tone={row.action === "delete" ? "bad" : row.action === "update" ? "warn" : "off"} marker={row.action === "delete"}>
          {ACTION_LABEL[row.action]}
        </StatusChip>
      ),
    },
    { key: "target", label: "대상", render: (row) => targetText(row.targetType, row.targetId, row.detailAction) },
    {
      key: "academyName",
      label: "학원",
      render: (row) =>
        row.academyName ? (
          <>
            <StyledCellDot $color={academyDotColor(row.academyName)} aria-hidden="true" />
            {row.academyName}
          </>
        ) : (
          "–"
        ),
    },
    { key: "ip", label: "접속 IP", render: (row) => row.ip ?? "–" },
  ];

  const loginColumns: RosterColumn<LoginHistoryItemResponseTypes>[] = [
    { key: "occurredAt", label: "시각", render: (row) => stampText(row.occurredAt) },
    { key: "loginId", label: "아이디", render: (row) => <b>{row.loginId}</b> },
    {
      key: "result",
      label: "결과",
      render: (row) =>
        row.result === null ? (
          "–"
        ) : row.result === "success" ? (
          <StatusChip tone="ok">성공</StatusChip>
        ) : (
          <StatusChip tone="bad">실패</StatusChip>
        ),
    },
    { key: "ip", label: "접속 IP", render: (row) => (row.ip && row.ip !== "-" ? row.ip : "–") },
    {
      key: "blockEvent",
      // block_event 는 차단 행과 해제 행 양쪽에 붙는다(§6.13, BR-219) — block_action 이 둘을 가른다(Ruling 394).
      label: "차단 · 해제",
      render: (row) => (row.blockAction ? <StatusChip tone={row.blockAction === "block" ? "bad" : "ok"}>{BLOCK_ACTION_LABEL[row.blockAction]}</StatusChip> : "–"),
    },
  ];

  return (
    <StyledAuditLogLayout>
      <PageHeader style={{ marginBottom: 20 }} title="감사 · 접속 이력" description="개인정보 조회 · 수정과 로그인 · 차단 기록 — 기록은 2년 보관 · 기본 조회는 오늘" />

      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {filterError ? <AlertBanner tone="missed" title={filterError} /> : null}

      <Tabs items={TAB_OPTIONS} value={tab} onChange={(value) => setTab(value as "audit" | "login")} aria-label="이력 종류" />

      <StyledFilterPanel>
      <StyledFilterRow>
        <StyledFilterField>
          <StyledFieldLabel>기간</StyledFieldLabel>
          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            aria-label="기간"
            onChange={(value) => {
              setPeriod(value as AuditPeriod);
              if (value === "custom") return;
              const range = periodRange(value as Exclude<AuditPeriod, "custom">, todayInSeoul());
              setFrom(range.from);
              setTo(range.to);
            }}
          />
        </StyledFilterField>
        <StyledFilterField>
          <Input label="시작일" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPeriod("custom"); }} />
        </StyledFilterField>
        <StyledFilterField>
          <Input label="종료일" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPeriod("custom"); }} />
        </StyledFilterField>
        <StyledFilterHint>{FROM_HINT}</StyledFilterHint>
      </StyledFilterRow>
      <StyledFilterRow>
        <StyledFilterField>
          <Select
            label="학원"
            value={academyId}
            onChange={(event) => setAcademyId(event.target.value)}
            options={[{ value: "", label: "전체 학원" }, ...academies.map((academy) => ({ value: String(academy.id), label: `${academy.name} (${academy.region})` }))]}
          />
        </StyledFilterField>
        <StyledActorSearchField>
          <StyledFieldLabel>행위자 찾기</StyledFieldLabel>
          <StyledActorSearchBox>
            <SearchField value={actorQuery} onChange={(event) => setActorQuery(event.target.value)} onSubmit={searchActors} placeholder="이름 또는 아이디" />
          </StyledActorSearchBox>
        </StyledActorSearchField>
        <StyledFilterField>
          <Select
            label="행위자"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            hint={actorSearched && actors.length === 0 ? "찾은 계정이 없습니다" : undefined}
            options={[
              { value: "", label: "전체 행위자" },
              ...actors.map((actor) => ({ value: actor.accountId, label: `${actor.name} (${actor.loginId})${actor.academyName ? ` · ${actor.academyName}` : ""}` })),
            ]}
          />
        </StyledFilterField>
        {tab === "audit" ? (
          <StyledFilterField>
            <StyledFieldLabel>동작</StyledFieldLabel>
            <SegmentedControl options={ACTION_FILTER_OPTIONS} value={action} onChange={setAction} aria-label="동작" />
          </StyledFilterField>
        ) : null}
        <Button variant="primary" icon="search" onClick={() => setApplied({ academyId, accountId, action, from, to })}>
          조회
        </Button>
      </StyledFilterRow>
      </StyledFilterPanel>

      {/* 표(RosterTable)는 자체가 카드라 바깥을 또 카드로 감싸지 않는다 — 빈 상태만 카드에 담는다(카드 안의 카드 방지). */}
      {tab === "audit" ? (
        auditItems.length === 0 && !loading && !error ? (
          <Card padding={0}>
            <EmptyState icon="file-search" title="조건에 맞는 감사 로그가 없습니다" />
          </Card>
        ) : (
          <RosterTable aria-busy={loading} hasError={Boolean(error)} onRetry={paging.reload} columns={auditColumns} loading={loading} rows={auditItems} getRowKey={(row, index) => `${row.targetType}-${row.targetId}-${index}`} />
        )
      ) : loginItems.length === 0 && !loading && !error ? (
        <Card padding={0}>
          <EmptyState icon="file-search" title="조건에 맞는 접속 이력이 없습니다" />
        </Card>
      ) : (
        <RosterTable aria-busy={loading} hasError={Boolean(error)} onRetry={paging.reload} columns={loginColumns} loading={loading} rows={loginItems} getRowKey={(row, index) => `${row.accountId}-${index}`} />
      )}

      <Pagination hasError={Boolean(error)} page={paging.page} size={PAGE_SIZE} totalCount={paging.totalCount} hasNext={paging.hasNext} onPageChange={paging.setPage} />
    </StyledAuditLogLayout>
  );
};
