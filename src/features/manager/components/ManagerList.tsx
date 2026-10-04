"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountPasswordResetDialog } from "@/features/auth";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, FilterBar, FilterGroup, Icon, PageHeader, Pagination, RosterTable, SearchField, SegmentedControl, StatStrip, StatusChip, Tabs } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import { useSavedNotice } from "@/shared/hooks";
import type { RosterColumn } from "@/shared/types";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { getManagers } from "../api";
import type { ManagerListFilters } from "../api";
import type { ManagerCountsTypes, ManagerItemResponseTypes, ManagerRole } from "../types";
import { assignmentsOn, formatMonthDay, formatWorkHours, openDriverCandidates, summarizeManagers } from "../lib/managerBoard";
import { ManagerDeleteDialog } from "./ManagerDeleteDialog";
import { ManagerForm } from "./ManagerForm";
import { StyledActionLink, StyledManagerLayout, StyledNameCell, StyledTodayCell, StyledUnassigned } from "./ManagerList.styled";

const PAGE_SIZE = 20;
// ponytail: 지표 · 기사 미배치 후보는 매니저 100명까지의 전량 조회로 계산한다 — 한 학원 매니저가 그 위로 늘면 서버 집계 필드로 올린다.
const SUMMARY_SIZE = 100;
const ROLE_LABEL: Record<ManagerRole, string> = { driver: "기사", escort: "동승자" };
const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;
const MAX_NAMES = 3;

/** 기사 미배치 회차 한 건 — 오늘 현황(`GET /staff/dashboard`)의 `driver_name` 이 null 인 회차. `manager` 가 `run` 을 읽지 않으니 페이지가 값을 넘긴다. */
export type UnassignedRun = { busNo: string; direction: "to_academy" | "from_academy"; departTime: string };

type ManagerListProps = {
  /** null 이면 아직 못 받았다(띠를 내지 않는다) */
  unassignedRuns?: UnassignedRun[] | null;
  /** 가입 승인 대기 건수 — `approval` 의 값을 페이지가 넘긴다(지표 칸 보조 문구) */
  pendingSignupCount?: number;
};

type AssignedFilter = "" | "true" | "false";

// 같은 호차는 한 줄로 — "2호차 등원 · 하원", 다른 호차는 줄을 바꾼다.
const todayLines = (manager: ManagerItemResponseTypes, today: string): string[] => {
  const byBus = new Map<string, string[]>();
  assignmentsOn(manager, today).forEach((assignment) => {
    byBus.set(assignment.busNo, [...(byBus.get(assignment.busNo) ?? []), DIRECTION_LABEL[assignment.direction]]);
  });
  return [...byBus.entries()].map(([busNo, directions]) => `${busNo} ${directions.join(" · ")}`);
};

// §5.13 GET /staff/managers?q=&role=&assigned_today=(MGR-01, A-12) — 매니저 관리 목록. 상세 GET 이 사양에
// 없어 수정은 이 목록의 행 데이터를 그대로 옆 패널에 채운다.
export const ManagerList = ({ unassignedRuns = null, pendingSignupCount }: ManagerListProps) => {
  const [today] = useState(() => todayInSeoul());
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | ManagerRole>("");
  const [assigned, setAssigned] = useState<AssignedFilter>("");
  const [items, setItems] = useState<ManagerItemResponseTypes[]>([]);
  const [all, setAll] = useState<ManagerItemResponseTypes[]>([]);
  const [counts, setCounts] = useState<ManagerCountsTypes | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notice, highlightedKey, showNotice } = useSavedNotice();
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ManagerItemResponseTypes | undefined>(undefined);
  const [resetting, setResetting] = useState<ManagerItemResponseTypes | undefined>(undefined);

  // 요청마다 번호를 매겨 마지막 요청의 응답만 화면에 반영한다 — 탭·필터를 빠르게 바꿀 때 늦게 온 옛 응답이 새 목록을 덮지 않게 한다.
  const requestSeq = useRef(0);

  const load = useCallback(async (nextPage: number, query: string, nextRole: "" | ManagerRole, nextAssigned: AssignedFilter) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    const filters: ManagerListFilters = { role: nextRole || undefined, assignedToday: nextAssigned === "" ? undefined : nextAssigned === "true" };
    try {
      const data = await getManagers(nextPage, PAGE_SIZE, query || undefined, filters);
      if (seq !== requestSeq.current) return;
      setItems(data.items);
      if (data.counts) setCounts(data.counts);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      if (seq !== requestSeq.current) return;
      setError(cause instanceof ApiError ? cause.message : "매니저 목록을 불러오지 못했습니다");
      setItems([]);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  // 지표 · 역할 탭 건수 · 기사 미배치 후보 — 조건 없이 전량을 따로 읽는다(보조 정보라 실패해도 목록은 그대로).
  const loadAll = useCallback(async () => {
    try {
      const data = await getManagers(0, SUMMARY_SIZE);
      setAll(data.items);
      if (data.counts) setCounts(data.counts);
    } catch {
      // 지표 칸이 비어 보일 뿐 — 목록 오류는 목록이 따로 보인다.
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(page, q, role, assigned);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    (async () => {
      await loadAll();
    })();
  }, [loadAll]);

  // 검색어·탭·오늘 배치 필터가 바뀌면 0쪽부터 다시 읽는다. 0쪽이 아니면 쪽이 바뀌며 위 effect 가 새 조건으로 조회한다.
  const handleConditionChange = (next: { q?: string; role?: "" | ManagerRole; assigned?: AssignedFilter }) => {
    const nextQ = next.q ?? q;
    const nextRole = next.role ?? role;
    const nextAssigned = next.assigned ?? assigned;
    setQ(nextQ);
    setRole(nextRole);
    setAssigned(nextAssigned);
    if (page !== 0) {
      setPage(0);
      return;
    }
    load(0, nextQ, nextRole, nextAssigned);
  };

  // savedManagerId — 등록·수정한 매니저의 id(삭제는 없다). 그 행을 잠깐 강조한다.
  const handleDone = (savedManagerId?: string) => {
    showNotice("변경 사항을 반영했습니다", savedManagerId);
    setEditingId(undefined);
    setCreating(false);
    setDeleting(undefined);
    load(page, q, role, assigned);
    loadAll();
  };

  const summary = useMemo(() => summarizeManagers(all, today), [all, today]);
  const editingRow = items.find((row) => row.id === editingId);
  const filtered = Boolean(q || role || assigned);

  const columns: RosterColumn<ManagerItemResponseTypes>[] = [
    {
      key: "name",
      label: "이름 · 전화번호",
      render: (row) => (
        <StyledNameCell>
          <b>{row.name}</b>
          <small>{row.phone}</small>
        </StyledNameCell>
      ),
    },
    {
      key: "role",
      label: "역할",
      render: (row) => (
        <StatusChip tone="off" marker={false}>
          {ROLE_LABEL[row.role]}
        </StatusChip>
      ),
    },
    { key: "workHours", label: "근무 시간", render: (row) => formatWorkHours(row.workHours) },
    {
      key: "today",
      label: `오늘 배치 (${formatMonthDay(today)})`,
      render: (row) => {
        const lines = todayLines(row, today);
        return lines.length > 0 ? (
          <StyledTodayCell>
            {lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </StyledTodayCell>
        ) : (
          <StyledUnassigned>배치 없음</StyledUnassigned>
        );
      },
    },
    {
      // B1 #8 — 앱에서 가입 신청해 승인을 받으면 이 기록에 계정이 연결된다. 그 전에는 앱에 들어올 수 없다.
      key: "accountId",
      label: "앱 계정",
      render: (row) =>
        row.accountId ? (
          <StatusChip tone="ok" marker={false} quiet>
            연결됨
          </StatusChip>
        ) : (
          <StatusChip tone="off" marker={false}>
            앱 가입 전
          </StatusChip>
        ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <>
          {/* 관리자 경유 비밀번호 초기화(§5.22) — 계정이 연결된 매니저만. 지원 업무에서 가장 자주 쓰는 동작이라 행에 둔다 */}
          {row.accountId ? (
            <Button
              variant="ghost"
              size="sm"
              icon="key-round"
              aria-label={`${row.name} 비밀번호 초기화`}
              onClick={(event) => {
                event.stopPropagation();
                setResetting(row);
              }}
            >
              비밀번호 초기화
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" iconEnd="chevron-right" aria-label={`${row.name} 상세`} onClick={(event) => {
            event.stopPropagation();
            setEditingId(row.id);
          }}>
            상세
          </Button>
        </>
      ),
    },
  ];

  const unassignedNames = summary.unassignedToday.map((manager) => manager.name);
  const unassignedDrivers = summary.unassignedToday.filter((manager) => manager.role === "driver").length;
  const summaryItems: StatStripItem[] = [
    { label: "매니저", value: summary.total, unit: "명", detail: `기사 ${summary.drivers} · 동승자 ${summary.escorts}` },
    {
      label: "앱 계정 연결",
      value: summary.linked,
      unit: "명",
      detail: (
        <>
          앱 가입 전 {summary.unlinked}명
          {pendingSignupCount ? (
            <>
              <br />
              가입 승인 대기 {pendingSignupCount}건
            </>
          ) : null}
        </>
      ),
    },
    {
      label: "오늘 배치",
      value: counts?.assignedToday ?? summary.assignedToday,
      unit: "명",
      detail: `기사 ${summary.drivers - unassignedDrivers} · 동승자 ${summary.escorts - (summary.unassignedToday.length - unassignedDrivers)}`,
    },
    {
      label: "오늘 배치 없음",
      value: counts?.unassignedToday ?? summary.unassignedToday.length,
      unit: "명",
      tone: (counts?.unassignedToday ?? summary.unassignedToday.length) > 0 ? "warn" : "neutral",
      detail:
        unassignedNames.length === 0
          ? "오늘은 모두 배치됐습니다"
          : `${unassignedNames.slice(0, MAX_NAMES).join(" · ")}${unassignedNames.length > MAX_NAMES ? ` 외 ${unassignedNames.length - MAX_NAMES}명` : ""} (${
              unassignedDrivers === unassignedNames.length ? "모두 기사" : `기사 ${unassignedDrivers} · 동승자 ${unassignedNames.length - unassignedDrivers}`
            })`,
    },
  ];

  const firstOpen = unassignedRuns?.[0];
  const candidates = firstOpen ? openDriverCandidates(firstOpen, all, today) : [];

  // 조회가 실패했으면 모르는 건수를 0 으로 보이지 않도록 지표 · 필터를 그리지 않는다.
  const failed = Boolean(error) && items.length === 0;

  return (
    <StyledManagerLayout>
      <PageHeader
        title="매니저 관리"
        description={error ? undefined : "기사·동승자의 근무 시간과 오늘 배치를 함께 보고, 배치가 비는 곳부터 채웁니다"}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            매니저 등록
          </Button>
        }
      />

      {firstOpen ? (
        <AlertBanner
          tone="moving"
          title={`${firstOpen.busNo} ${DIRECTION_LABEL[firstOpen.direction]}(${formatClockTime(firstOpen.departTime)})에 기사가 배치되지 않았습니다${(unassignedRuns?.length ?? 0) > 1 ? ` 외 ${(unassignedRuns?.length ?? 1) - 1}회` : ""}`}
          action={
            <StyledActionLink href="/today-run">
              <Icon name="arrow-right" size={14} /> 운행 상세에서 배치
            </StyledActionLink>
          }
        >
          {candidates.length > 0 ? (
            <>
              오늘 배치가 없는 기사 <b>{candidates.map((manager) => manager.name).join(" · ")}</b> {candidates.length > 1 ? "모두 " : ""}
              {formatClockTime(firstOpen.departTime)} 에 근무 시간 안입니다.
            </>
          ) : (
            "오늘 배치가 없는 기사 중 그 시각에 근무하는 사람이 없습니다 — 근무 시간을 확인해 주세요."
          )}
        </AlertBanner>
      ) : null}

      {failed ? null : (
        <>
          <StatStrip items={summaryItems} />

          <Tabs
            aria-label="역할"
            items={[
              { value: "", label: "전체", count: summary.total },
              { value: "driver", label: "기사", count: summary.drivers },
              { value: "escort", label: "동승자", count: summary.escorts },
            ]}
            value={role}
            onChange={(value) => handleConditionChange({ role: value as "" | ManagerRole })}
          />

          <FilterBar summary={`총 ${totalCount}명 · 이름순`}>
            <SearchField placeholder="이름으로 검색" onSubmit={(value) => handleConditionChange({ q: value })} />
            <FilterGroup label="오늘 배치">
              <SegmentedControl
                aria-label="오늘 배치 필터"
                options={[
                  { value: "", label: "전체" },
                  { value: "true", label: "배치 있음" },
                  { value: "false", label: "배치 없음" },
                ]}
                value={assigned}
                onChange={(value) => handleConditionChange({ assigned: value as AssignedFilter })}
              />
            </FilterGroup>
          </FilterBar>
        </>
      )}

      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {notice ? <AlertBanner tone="boarded" title={notice} role="status" /> : null}

      <Card flush aria-busy={loading}>
        <RosterTable hasError={Boolean(error)} onRetry={() => load(page, q, role, assigned)}
          emptyMessage={q ? `'${q}' 검색 결과가 없습니다` : filtered ? "조건에 맞는 매니저가 없습니다" : "등록된 매니저가 없습니다"}
          emptyAction={filtered ? undefined : { label: "매니저 등록", onClick: () => setCreating(true) }}
          highlightedKey={highlightedKey}
          selectedKey={editingId ?? null}
          rowTone={(row) => (todayLines(row, today).length === 0 && Boolean(row.workHours && Object.keys(row.workHours).length > 0) ? "warn" : undefined)}
          columns={columns}
          loading={loading}
          rows={items}
          getRowKey={(row) => row.id}
          onRowClick={(row) => setEditingId(row.id)}
        />
      </Card>

      <Pagination hasError={Boolean(error)}
        page={page}
        size={PAGE_SIZE}
        totalCount={totalCount}
        hasNext={hasNext}
        onPageChange={setPage}
      />

      {editingRow ? (
        <ManagerForm
          key={editingRow.id}
          manager={editingRow}
          today={today}
          onClose={() => setEditingId(undefined)}
          onDone={handleDone}
          onDelete={() => {
            setEditingId(undefined);
            setDeleting(editingRow);
          }}
        />
      ) : null}
      {creating ? <ManagerForm onClose={() => setCreating(false)} onDone={handleDone} /> : null}
      {deleting ? <ManagerDeleteDialog manager={deleting} onClose={() => setDeleting(undefined)} onDone={handleDone} /> : null}
      {resetting?.accountId ? (
        <AccountPasswordResetDialog
          accountId={resetting.accountId}
          name={resetting.name}
          roleLabel={ROLE_LABEL[resetting.role]}
          phone={resetting.phone}
          onClose={() => setResetting(undefined)}
        />
      ) : null}
    </StyledManagerLayout>
  );
};
