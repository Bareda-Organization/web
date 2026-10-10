"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, EmptyState, FilterBar, FilterGroup, PageHeader, Pagination, RosterTable, SearchField, Select, Skeleton, SkeletonGroup, StatStrip, StatusChip, Tabs } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import { useSavedNotice } from "@/shared/hooks";
import type { RosterColumn } from "@/shared/types";
import { getStudents } from "../api";
import type { StudentListFilter, StudentListItemResponseTypes, StudentListSummaryTypes } from "../types";
import { StudentForm } from "./StudentForm";
import { StudentWithdrawDialog } from "./StudentWithdrawDialog";
import { StyledStudentFooter, StyledStudentLayout, StyledSubText } from "./StudentList.styled";

const PAGE_SIZE = 20;

// §5.11 GET /staff/students?q=(STU-01, A-10) — 학생 관리 목록. 행 클릭으로 수정,
// 별도 버튼으로 퇴원(soft delete) 처리. 타 학원 학생은 404 로 존재 자체를 감춘다
// (§1.11 표는 이 화면을 다루지 않음 — Ruling 163, 확인 근거는 보고서 §2).
export const StudentList = () => {
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  // 탭("" 재원 · guardian_unlinked 보호자 미연결 · address_missing 주소 미등록) · 반 필터 — 서버 쿼리(Ruling 815)로 간다.
  const [filter, setFilter] = useState<"" | StudentListFilter>("");
  const [className, setClassName] = useState("");
  const [summary, setSummary] = useState<StudentListSummaryTypes | null>(null);
  // 반 선택지 — 본 적 있는 반 이름을 쌓는다(서버가 반 목록을 따로 주지 않는다).
  const [classNames, setClassNames] = useState<string[]>([]);
  const [items, setItems] = useState<StudentListItemResponseTypes[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notice, highlightedKey, showNotice } = useSavedNotice();
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [withdrawing, setWithdrawing] = useState<StudentListItemResponseTypes | undefined>(undefined);

  // 요청마다 번호를 매겨 마지막 요청의 응답만 화면에 반영한다 — 필터·쪽을 빠르게 바꿀 때 늦게 온 옛 응답이 새 목록을 덮지 않게 한다(F02-04).
  const requestSeq = useRef(0);

  const load = useCallback(async (nextPage: number, query: string, nextFilter: "" | StudentListFilter, nextClassName: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await getStudents(nextPage, PAGE_SIZE, query || undefined, { className: nextClassName || undefined, filter: nextFilter || undefined });
      if (seq !== requestSeq.current) return;
      setItems(data.items);
      if (data.summary) setSummary(data.summary);
      setClassNames((known) => {
        const seen = new Set(known);
        data.items.forEach((item) => item.className && seen.add(item.className));
        return seen.size === known.length ? known : [...seen].sort();
      });
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      if (seq !== requestSeq.current) return;
      setError(cause instanceof ApiError ? cause.message : "학생 목록을 불러오지 못했습니다");
      setItems([]);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(page, q, filter, className);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 검색어·탭·반이 바뀌면 0쪽부터 다시 읽는다. 0쪽이 아니면 쪽이 바뀌며 위 effect 가 새 조건으로 조회한다 — 여기서도 부르면 같은 요청이 두 번 나간다.
  const handleConditionChange = (next: { q?: string; filter?: "" | StudentListFilter; className?: string }) => {
    const nextQ = next.q ?? q;
    const nextFilter = next.filter ?? filter;
    const nextClassName = next.className ?? className;
    setQ(nextQ);
    setFilter(nextFilter);
    setClassName(nextClassName);
    if (page !== 0) {
      setPage(0);
      return;
    }
    load(0, nextQ, nextFilter, nextClassName);
  };
  const handleSearch = (value: string) => handleConditionChange({ q: value });

  // savedStudentId — 등록·수정한 학생의 id(퇴원은 없다). 그 행을 잠깐 강조한다.
  const handleDone = (savedStudentId?: string) => {
    showNotice("변경 사항을 반영했습니다", savedStudentId);
    setEditingId(undefined);
    setCreating(false);
    setWithdrawing(undefined);
    load(page, q, filter, className);
  };

  const columns: RosterColumn<StudentListItemResponseTypes>[] = [
    { key: "name", label: "이름", render: (row) => <b>{row.name}</b> },
    { key: "className", label: "반", render: (row) => row.className ?? "-" },
    { key: "grade", label: "학년", render: (row) => row.grade ?? "-" },
    {
      key: "guardianPhone",
      label: "보호자 연락처",
      render: (row) => (
        <>
          {row.guardianPhone ?? <span>보호자 미연결</span>}
          {row.guardianCount > 0 ? <StyledSubText>{row.guardianCount}명 연결</StyledSubText> : null}
        </>
      ),
    },
    {
      key: "accountLinked",
      label: "학생 앱",
      render: (row) =>
        row.accountLinked ? (
          <StatusChip tone="ok" marker={false} quiet>
            연결
          </StatusChip>
        ) : (
          <StatusChip tone="off" marker={false}>
            미연결
          </StatusChip>
        ),
    },
    {
      key: "weeklyAddressStatus",
      label: "요일별 주소",
      render: (row) =>
        row.weeklyAddressStatus === "complete" ? (
          <StatusChip tone="ok" marker={false} quiet>
            등록 완료
          </StatusChip>
        ) : row.weeklyAddressStatus === "partial" ? (
          <StatusChip tone="warn">일부 등록</StatusChip>
        ) : (
          <StatusChip tone="bad">미등록</StatusChip>
        ),
    },
    { key: "canGoAlone", label: "혼자 귀가", render: (row) => (row.canGoAlone ? "가능" : "-") },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="ghost" size="sm" iconEnd="chevron-right" aria-label={`${row.name} 상세`} onClick={(event) => {
          event.stopPropagation();
          setEditingId(row.studentId);
        }}>
          상세
        </Button>
      ),
    },
  ];

  const editingRow = items.find((row) => row.studentId === editingId);
  // 처음 읽는 중이거나(지표 · 목록이 아직 없다) 처음부터 못 읽었을 때 — 시안의 뼈대 · 오류 화면. 한 번 읽은 뒤의 다시 읽기는 목록을 그대로 둔다.
  const firstLoad = loading && items.length === 0 && summary === null && !error;
  const firstFail = Boolean(error) && items.length === 0 && summary === null;
  const summaryItems: StatStripItem[] = [
    { label: "재원 학생", value: summary?.total ?? totalCount, unit: "명", detail: summary ? `반 ${summary.classCount}개` : "재원 중인 학생" },
    {
      label: "보호자 미연결",
      value: summary?.guardianUnlinked ?? "-",
      unit: "명",
      tone: (summary?.guardianUnlinked ?? 0) > 0 ? "warn" : "neutral",
      detail: "학부모 앱 가입 · 연결 코드 입력 전 연락처 · 알림을 받을 사람이 없음",
    },
    {
      label: "요일별 주소 미등록",
      value: summary?.addressMissing ?? "-",
      unit: "명",
      tone: (summary?.addressMissing ?? 0) > 0 ? "warn" : "neutral",
      detail: "승하차지가 없어 어느 노선에도 들어가지 못함",
    },
    { label: "혼자 귀가 가능", value: summary?.canGoAlone ?? "-", unit: "명", detail: "도착 시 보호자 인계 없이 하차" },
  ];

  return (
    <StyledStudentLayout>
      <PageHeader
        title="학생 관리"
        description={
          firstFail
            ? "학생 목록을 가져오지 못했습니다"
            : firstLoad
              ? "학생 목록을 불러오는 중입니다…"
              : error
                ? undefined
                : q
                  ? `'${q}' 검색 결과 ${totalCount}명`
                  : `재원 학생 ${summary?.total ?? totalCount}명 — 보호자 연결과 요일별 승하차 주소가 비어 있는 학생부터 확인합니다`
        }
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            학생 등록
          </Button>
        }
      />

      {firstFail ? (
        <Card>
          <EmptyState
            icon="cloud-off"
            tone="bad"
            title="학생 목록을 불러오지 못했습니다"
            action={
              <Button icon="refresh-cw" onClick={() => load(page, q, filter, className)}>
                다시 시도
              </Button>
            }
          >
            <span role="alert">{error}</span> 서버에 연결하지 못했습니다. 입력하던 내용은 없으니 안심하고 다시 시도해 주세요.
          </EmptyState>
        </Card>
      ) : (
        <>
          {firstLoad ? (
            <SkeletonGroup aria-label="학생 목록을 불러오는 중">
              <Skeleton variant="chart" />
            </SkeletonGroup>
          ) : null}
          {firstLoad ? null : <StatStrip items={summaryItems} />}

          <Tabs
            aria-label="학생 상태"
            items={[
              { value: "", label: "재원", count: summary?.total },
              { value: "guardian_unlinked", label: "보호자 미연결", count: summary?.guardianUnlinked },
              { value: "address_missing", label: "주소 미등록", count: summary?.addressMissing },
            ]}
            value={filter}
            onChange={(value) => handleConditionChange({ filter: value as "" | StudentListFilter })}
          />

          <FilterBar summary={`${totalCount}명 중 ${items.length}명 표시 · 이름순`}>
            <SearchField placeholder="이름으로 검색" onSubmit={handleSearch} />
            <FilterGroup label="반">
              <Select
                aria-label="반 필터"
                value={className}
                options={[{ value: "", label: "전체" }, ...classNames.map((name) => ({ value: name, label: name }))]}
                onChange={(event) => handleConditionChange({ className: event.target.value })}
              />
            </FilterGroup>
          </FilterBar>

          {error ? <AlertBanner tone="missed" title={error} /> : null}
          {notice ? <AlertBanner tone="boarded" title={notice} role="status" /> : null}

          <Card flush aria-busy={loading}>
            <RosterTable hasError={Boolean(error)} onRetry={() => load(page, q, filter, className)}
              emptyMessage={q ? `'${q}' 검색 결과가 없습니다` : filter || className ? "조건에 맞는 학생이 없습니다" : "등록된 학생이 없습니다"}
              emptyAction={q || filter || className ? undefined : { label: "학생 등록", onClick: () => setCreating(true) }}
              highlightedKey={highlightedKey}
              selectedKey={editingId ?? null}
              columns={columns}
              loading={loading}
              rows={items}
              getRowKey={(row) => row.studentId}
              onRowClick={(row) => setEditingId(row.studentId)}
            />
            <StyledStudentFooter>
              <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />
            </StyledStudentFooter>
          </Card>
        </>
      )}

      {editingId ? (
        <StudentForm studentId={editingId} onClose={() => setEditingId(undefined)} onDone={handleDone} onWithdraw={editingRow ? () => { setEditingId(undefined); setWithdrawing(editingRow); } : undefined} />
      ) : null}
      {creating ? <StudentForm onClose={() => setCreating(false)} onDone={handleDone} /> : null}
      {withdrawing ? (
        <StudentWithdrawDialog student={withdrawing} onClose={() => setWithdrawing(undefined)} onDone={handleDone} />
      ) : null}
    </StyledStudentLayout>
  );
};
