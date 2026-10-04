"use client";

import { useMemo, useState } from "react";
import { BoardingStatusChip, Button, FilterBar, FilterGroup, RosterTable, SearchField, SegmentedControl, Select, StatusChip } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import type { RosterItemResponseTypes } from "../types";
import { filterRoster, rosterCounts, rosterStopKey, stopPassage, UNASSIGNED_STOP, type RosterStatusFilter } from "../lib/rosterBoard";
import { PhoneLink } from "./PhoneLink";
import { StyledGroupLabel, StyledRosterCard, StyledRosterCardHead, StyledRosterFootnote, StyledRosterScroll } from "./TodayRunPage.styled";

type RouteStopRef = { stopId: string; name: string };

type Props = {
  roster: RosterItemResponseTypes[];
  routeStops: RouteStopRef[];
  currentStop: string | null;
  nextStop: string | null;
  isIdle: boolean;
  canTransfer: boolean;
  loading: boolean;
  statusFilter: RosterStatusFilter;
  onStatusFilterChange: (next: RosterStatusFilter) => void;
  onTransfer: (row: RosterItemResponseTypes) => void;
  onCancelTransfer: (row: RosterItemResponseTypes & { transferId: string }) => void;
};

const PASSAGE_LABEL = { passed: "통과", current: "현재 정차지", next: "다음 정차지" } as const;

// 탑승 명단 — 상태 칩 건수 · 이름 검색 · 정차지 필터 · 정차지 묶음. 미승차 행은 위험색 + [보호자 전화](U-08), 미등원은 회색(Ruling 811).
export const RunRosterCard = ({
  roster,
  routeStops,
  currentStop,
  nextStop,
  isIdle,
  canTransfer,
  loading,
  statusFilter,
  onStatusFilterChange,
  onTransfer,
  onCancelTransfer,
}: Props) => {
  const [query, setQuery] = useState("");
  const [stopKey, setStopKey] = useState<string>("");

  const counts = useMemo(() => rosterCounts(roster), [roster]);
  const stopOptions = useMemo(() => {
    const seen = new Map<string, string>();
    roster.forEach((item) => {
      const key = rosterStopKey(item);
      if (!seen.has(key)) seen.set(key, item.stopName ?? UNASSIGNED_STOP);
    });
    return [{ value: "", label: "전체" }, ...[...seen.entries()].map(([value, label]) => ({ value, label }))];
  }, [roster]);

  const filtered = useMemo(() => filterRoster(roster, { status: statusFilter, stopKey: stopKey || null, query }), [roster, statusFilter, stopKey, query]);

  // 운행 중 · 종료 회차는 상태별 건수, 확정 전 회차는 추가 · 이동 대기 건수를 칩으로 둔다.
  const statusOptions: { value: RosterStatusFilter; label: string }[] = isIdle
    ? [
        { value: "all", label: `전체 ${counts.all}` },
        ...(counts.added > 0 ? [{ value: "added" as const, label: `추가 ${counts.added}` }] : []),
        ...(counts.transfer > 0 ? [{ value: "transfer" as const, label: `이동 대기 ${counts.transfer}` }] : []),
      ]
    : [
        { value: "all", label: `전체 ${counts.all}` },
        ...(counts.no_show > 0 ? [{ value: "no_show" as const, label: `미승차 ${counts.no_show}` }] : []),
        ...(counts.absent > 0 ? [{ value: "absent" as const, label: `미등원 ${counts.absent}` }] : []),
        { value: "waiting", label: `대기 ${counts.waiting}` },
        { value: "boarded", label: `탑승 완료 ${counts.boarded}` },
      ];

  const stopOrder = useMemo(() => new Map(routeStops.map((stop, index) => [stop.stopId, index + 1])), [routeStops]);

  const columns: RosterColumn<RosterItemResponseTypes>[] = [
    { key: "name", label: "이름", render: (row) => <b>{row.name}</b> },
    { key: "className", label: "반", render: (row) => row.className ?? "-" },
    { key: "guardianPhone", label: "보호자 연락처", render: (row) => row.guardianPhone ?? <span>보호자 미연결</span> },
    { key: "status", label: "상태", render: (row) => <BoardingStatusChip status={row.status} /> },
    {
      key: "change",
      label: "변경",
      render: (row) =>
        row.change ? <StatusChip tone={row.change === "added" ? "conf" : "bad"} quiet>{row.change === "added" ? "추가" : "제외"}</StatusChip> : "-",
    },
    {
      key: "action",
      label: "조치",
      align: "right",
      render: (row) => {
        const { transferId } = row;
        // 이동 대기 행은 다시 옮기면 서버가 TRANSFER_ALREADY_STAGED 로 거절한다(§5.8) — [이동 취소] 만 둔다.
        if (transferId != null) {
          return (
            <Button variant="ghost" size="sm" aria-label={`${row.name} 이동 취소`} onClick={() => onCancelTransfer({ ...row, transferId })}>
              이동 취소
            </Button>
          );
        }
        if (row.status === "no_show" && row.guardianPhone) return <PhoneLink phone={row.guardianPhone} label="보호자 전화" />;
        return canTransfer && row.change !== "removed" ? (
          <Button variant="ghost" size="sm" aria-label={`${row.name} 다른 버스로`} onClick={() => onTransfer(row)}>
            다른 버스로
          </Button>
        ) : null;
      },
    },
  ];

  return (
    <StyledRosterCard aria-label="탑승 명단" aria-busy={loading}>
      <StyledRosterCardHead>
        <h2>탑승 명단 {roster.length}명</h2>
        <p>{isIdle ? "정차지 순" : "정차지 순 · 위쪽이 이미 지난 정차지"}</p>
        <SearchField value={query} onChange={(event) => setQuery(event.target.value)} onSubmit={setQuery} placeholder="학생 이름 검색" aria-label="학생 이름 검색" />
      </StyledRosterCardHead>
      <FilterBar style={{ marginBottom: 16 }}>
        <FilterGroup label="상태">
          <SegmentedControl aria-label="상태 필터" options={statusOptions} value={statusFilter} onChange={(value) => onStatusFilterChange(value as RosterStatusFilter)} />
        </FilterGroup>
        <FilterGroup label="정차지">
          <Select aria-label="정차지 필터" options={stopOptions} value={stopKey} onChange={(event) => setStopKey(event.target.value)} />
        </FilterGroup>
      </FilterBar>
      <StyledRosterScroll>
        <RosterTable
          columns={columns}
          loading={loading}
          rows={filtered}
          emptyMessage={roster.length === 0 ? undefined : "조건에 맞는 학생이 없습니다"}
          getRowKey={(row) => row.studentId}
          rowTone={(row) => (row.status === "no_show" ? "bad" : undefined)}
          groupBy={rosterStopKey}
          renderGroupLabel={(key, rows) => {
            const first = rows[0];
            const seq = (first.stopId ? stopOrder.get(first.stopId) : undefined) ?? first.stopSeq ?? null;
            const passage = first.stopId ? stopPassage(routeStops, first.stopId, currentStop, nextStop) : null;
            return (
              <StyledGroupLabel>
                {seq !== null ? <i>{seq}</i> : null}
                <span>{first.stopName ?? UNASSIGNED_STOP}</span>
                <small>{rows.length}명</small>
                {passage ? (
                  <StatusChip tone={passage === "passed" ? "ok" : passage === "current" ? "move" : "wait"} quiet={passage === "passed"} marker={passage !== "passed"}>
                    {PASSAGE_LABEL[passage]}
                  </StatusChip>
                ) : null}
              </StyledGroupLabel>
            );
          }}
        />
      </StyledRosterScroll>
      <StyledRosterFootnote>
        {isIdle
          ? "확정 전(출발 30분 전까지) 명단입니다 — 다른 버스로 옮기면 출발 30분 전 확정 때 양쪽 명단에 반영됩니다."
          : "확정된 회차는 명단을 바꿀 수 없습니다 — 다른 버스로 옮기기 · 강제 추가는 출발 30분 전까지만 가능합니다."}
      </StyledRosterFootnote>
    </StyledRosterCard>
  );
};
