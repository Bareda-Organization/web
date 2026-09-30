"use client";

import { useEffect, useState } from "react";
import { usePagedList } from "@/shared/hooks";
import { AlertBanner, Badge, Button, Card, EmptyState, Input, PageHeader, Pagination, RosterTable, SearchField, SegmentedControl, Select } from "@/shared/ui";
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

// 동작 필터의 선택지 — 빈 값은 "거르지 않음"(서버도 action 을 안 받으면 셋 다 돌려준다).
const ACTION_FILTER_OPTIONS = [
  { value: "", label: "전체 동작" },
  { value: "read", label: ACTION_LABEL.read },
  { value: "update", label: ACTION_LABEL.update },
  { value: "delete", label: ACTION_LABEL.delete },
];

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
  const [action, setAction] = useState("");
  const [academies, setAcademies] = useState<AcademySummaryResponseTypes[]>([]);
  const [actorQuery, setActorQuery] = useState("");
  const [actors, setActors] = useState<AuditActorResponseTypes[]>([]);
  const [actorSearched, setActorSearched] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [from, setFrom] = useState(todayInSeoul());
  const [to, setTo] = useState("");

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
      {filterError ? <AlertBanner tone="missed" title={filterError} /> : null}

      <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={(value) => setTab(value as "audit" | "login")} />

      <StyledFilterRow>
        <StyledFilterField>
          <Select
            label="학원"
            value={academyId}
            onChange={(event) => setAcademyId(event.target.value)}
            options={[{ value: "", label: "전체 학원" }, ...academies.map((academy) => ({ value: String(academy.id), label: `${academy.name} (${academy.region})` }))]}
          />
        </StyledFilterField>
        <StyledFilterField>
          <SearchField value={actorQuery} onChange={(event) => setActorQuery(event.target.value)} onSubmit={searchActors} placeholder="이름 또는 아이디로 행위자 찾기" />
        </StyledFilterField>
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
            <Select label="동작" value={action} onChange={(event) => setAction(event.target.value)} options={ACTION_FILTER_OPTIONS} />
          </StyledFilterField>
        ) : null}
        <StyledFilterField>
          <Input label="시작일" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </StyledFilterField>
        <StyledFilterField>
          <Input label="종료일" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </StyledFilterField>
        <Button variant="secondary" onClick={() => setFrom("")}>
          전체 기간 보기
        </Button>
        <Button variant="primary" onClick={() => setApplied({ academyId, accountId, action, from, to })}>
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
