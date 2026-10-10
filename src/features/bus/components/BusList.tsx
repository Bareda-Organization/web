"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, FilterBar, FilterGroup, PageHeader, Pagination, RosterTable, RunStatusChip, SegmentedControl, StatStrip, StatusChip } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import { useSavedNotice } from "@/shared/hooks";
import type { RosterColumn } from "@/shared/types";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { getBuses } from "../api";
import type { BusItemResponseTypes } from "../types";
import { filterBuses, seatSplit, summarizeBuses } from "../lib/busBoard";
import type { BusStatusFilter } from "../lib/busBoard";
import { BusForm } from "./BusForm";
import {
  StyledBusFooter,
  StyledBusLayout,
  StyledLinkPair,
  StyledMuted,
  StyledSeatBar,
  StyledSeatCell,
  StyledSeatNote,
  StyledSeatSegment,
  StyledSeatTrack,
  StyledTodayRun,
  StyledTodayRuns,
} from "./BusList.styled";

const PAGE_SIZE = 20;
const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;
const MAX_RESTING_NAMES = 2;

/** 기사 미배치 회차 한 건 — 오늘 현황(`GET /staff/dashboard`)의 `driver_name` 이 null 인 회차. `bus` 가 `run` 을 읽지 않으니 페이지가 값을 넘긴다. */
export type UnassignedRun = { busNo: string; direction: "to_academy" | "from_academy"; departTime: string };

type BusListProps = {
  /** null 이면 아직 못 받았다(지표 칸은 값을 단정하지 않고 `-`). 안 주면 지표 칸을 `-` 로 둔다. */
  unassignedRuns?: UnassignedRun[] | null;
};

const restingNote = (summary: ReturnType<typeof summarizeBuses>): string => {
  const names = summary.restingBusNos;
  const shown = names.slice(0, MAX_RESTING_NAMES).join(" · ");
  const rest = names.length > MAX_RESTING_NAMES ? ` 외 ${names.length - MAX_RESTING_NAMES}대` : "";
  const running = `${summary.runningBusCount}대가 운행`;
  return names.length > 0 ? `${running} · ${shown}${rest}는 쉼` : running;
};

// §5.12 GET /staff/buses(BUS-01, A-11) — 차량 관리 목록. 상세 GET 이 사양에 없어
// 수정은 이 목록의 행 데이터를 그대로 폼에 채운다(§2 판단 근거 참조).
export const BusList = ({ unassignedRuns = null }: BusListProps) => {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<BusItemResponseTypes[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<BusStatusFilter>("");
  const { notice, highlightedKey, showNotice } = useSavedNotice();
  const [editing, setEditing] = useState<BusItemResponseTypes | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const data = await getBuses(nextPage, PAGE_SIZE);
      setItems(data.items);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "차량 목록을 불러오지 못했습니다");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(page);
    })();
  }, [page, load]);

  // savedBusId — 등록·수정한 차량의 id. 그 행을 잠깐 강조한다.
  const handleDone = (savedBusId?: string) => {
    showNotice("변경 사항을 반영했습니다", savedBusId);
    setEditing(undefined);
    setCreating(false);
    load(page);
  };

  // ponytail: 지표는 지금 보는 쪽(20대)의 합이다 — 보유 차량 수만 서버 총건수. 차량이 한 쪽을 넘기면 전량 조회로 올린다.
  const summary = useMemo(() => summarizeBuses(items), [items]);
  const shown = useMemo(() => filterBuses(items, status), [items, status]);

  const columns: RosterColumn<BusItemResponseTypes>[] = [
    { key: "busNo", label: "호차", render: (row) => <b>{row.busNo}</b> },
    { key: "plateNo", label: "차량번호" },
    {
      key: "seats",
      label: "좌석 구성",
      render: (row) => {
        const { student, reserved } = seatSplit(row);
        return (
          <StyledSeatCell>
            <StyledSeatBar>
              <StyledSeatTrack aria-hidden="true">
                <StyledSeatSegment $kind="student" $flex={student} />
                {reserved > 0 ? <StyledSeatSegment $kind="reserved" $flex={reserved} /> : null}
              </StyledSeatTrack>
              {row.capacity}석
            </StyledSeatBar>
            <StyledSeatNote>{reserved === 2 ? `학생 ${student} · 기사 1 · 동승자 1` : `학생 ${student} · 기사·동승자 ${reserved}`}</StyledSeatNote>
          </StyledSeatCell>
        );
      },
    },
    {
      key: "links",
      label: "연결된 편성 · 스케줄",
      render: (row) =>
        row.routeCount + row.scheduleCount === 0 ? (
          <StyledMuted>연결 없음</StyledMuted>
        ) : (
          <StyledLinkPair>
            <Link href={`/route?bus=${row.id}`}>편성 {row.routeCount}</Link>·<Link href={`/schedule?bus=${row.id}`}>스케줄 {row.scheduleCount}</Link>
          </StyledLinkPair>
        ),
    },
    {
      key: "todayRuns",
      label: "오늘 운행",
      render: (row) =>
        row.todayRuns.length === 0 ? (
          <StyledMuted>오늘 운행 없음</StyledMuted>
        ) : (
          <StyledTodayRuns>
            {row.todayRuns.map((run) => (
              <StyledTodayRun key={run.runId}>
                {DIRECTION_LABEL[run.direction]} {formatClockTime(run.departTime)}
                <RunStatusChip status={run.status} />
              </StyledTodayRun>
            ))}
          </StyledTodayRuns>
        ),
    },
    {
      key: "operable",
      label: "상태",
      render: (row) =>
        row.operable ? (
          <StatusChip tone="ok" marker={false} quiet>
            운행 가능
          </StatusChip>
        ) : (
          <StatusChip tone="bad">운행 불가</StatusChip>
        ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="ghost" size="sm" icon="pencil" aria-label={`${row.busNo} 수정`} onClick={(event) => {
          event.stopPropagation();
          setEditing(row);
        }}>
          수정
        </Button>
      ),
    },
  ];

  const first = unassignedRuns?.[0];
  const summaryItems: StatStripItem[] = [
    { label: "보유 차량", value: totalCount, unit: "대", detail: `운행 가능 ${summary.operable} · 운행 불가 ${summary.inoperable}` },
    {
      label: "학생 탑승 가능",
      value: summary.studentSeats,
      unit: "명",
      detail: (
        <>
          운행 가능 차량 합계
          <br />
          (정원 − 기사 1 − 동승자 1)
        </>
      ),
    },
    { label: "오늘 운행", value: summary.runCount, unit: "회", detail: restingNote(summary) },
    {
      label: "기사 미배치 회차",
      value: unassignedRuns === null ? "-" : unassignedRuns.length,
      unit: unassignedRuns === null ? undefined : "회",
      tone: (unassignedRuns?.length ?? 0) > 0 ? "warn" : "neutral",
      detail: first ? (
        <>
          {first.busNo} {DIRECTION_LABEL[first.direction]} {formatClockTime(first.departTime)}
          <br />
          배치 필요
        </>
      ) : unassignedRuns === null ? undefined : (
        "오늘 모든 회차에 기사 배치"
      ),
    },
  ];

  // 조회가 실패했으면 모르는 건수를 0 으로 보이지 않도록 지표 · 필터를 그리지 않는다.
  const failed = Boolean(error) && items.length === 0;

  return (
    <StyledBusLayout>
      <PageHeader
        title="차량 관리"
        description={error ? undefined : "학생이 탑승할 수 있는 좌석과 오늘 운행 현황을 한 줄에서 확인합니다"}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            차량 등록
          </Button>
        }
      />

      {failed ? null : (
        <>
          <StatStrip items={summaryItems} />

          <FilterBar summary={`총 ${shown.length}대`}>
            <FilterGroup label="상태">
              <SegmentedControl
                aria-label="상태 필터"
                options={[
                  { value: "", label: "전체" },
                  { value: "operable", label: "운행 가능" },
                  { value: "inoperable", label: "운행 불가" },
                ]}
                value={status}
                onChange={(value) => setStatus(value as BusStatusFilter)}
              />
            </FilterGroup>
          </FilterBar>
        </>
      )}

      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {notice ? <AlertBanner tone="boarded" title={notice} role="status" /> : null}

      <Card flush aria-busy={loading}>
        <RosterTable hasError={Boolean(error)} onRetry={() => load(page)} emptyMessage={status ? "조건에 맞는 차량이 없습니다" : "등록된 차량이 없습니다"}
          emptyAction={status ? undefined : { label: "차량 등록", onClick: () => setCreating(true) }}
          highlightedKey={highlightedKey} columns={columns} loading={loading} rows={shown} getRowKey={(row) => row.id} onRowClick={setEditing} />
        <StyledBusFooter>
          학생 탑승 가능 인원은 입력하지 않습니다 — 정원에서 기사 1명 · 동승자 1명을 뺀 값을 시스템이 계산합니다. 정원을 줄여 이미 배정된 학생이 넘치면 저장은 되고 경고만 알려 줍니다.
        </StyledBusFooter>
      </Card>

      <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {editing ? <BusForm bus={editing} onClose={() => setEditing(undefined)} onDone={handleDone} /> : null}
      {creating ? <BusForm onClose={() => setCreating(false)} onDone={handleDone} /> : null}
    </StyledBusLayout>
  );
};
