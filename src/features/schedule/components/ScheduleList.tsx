"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBuses } from "@/features/bus";
import type { BusItemResponseTypes } from "@/features/bus";
import { ApiError } from "@/shared/lib/http";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { AlertBanner, Button, Card, FilterBar, FilterGroup, Icon, RosterTable, SegmentedControl, StatStrip, StatusChip } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getRuns, getSchedules } from "../api";
import type { RunItemResponseTypes, ScheduleDirection, ScheduleItemResponseTypes, ScheduleWeekday } from "../types";
import { addDays, buildScheduleGrid, summarizeSchedules, weekdayOf, WEEKDAY_LABEL, WEEKDAYS } from "../lib/scheduleBoard";
import type { GridBus, ScheduleGridRow } from "../lib/scheduleBoard";
import { ScheduleCopyDialog } from "./ScheduleCopyDialog";
import { ScheduleDeleteDialog } from "./ScheduleDeleteDialog";
import { ScheduleForm } from "./ScheduleForm";
import {
  StyledBusHead,
  StyledDayCell,
  StyledDirectionCell,
  StyledGridLegend,
  StyledNoRoute,
  StyledScheduleCell,
  StyledScheduleNote,
  StyledScheduleSection,
  StyledWeekGrid,
} from "./ScheduleList.styled";

// 요일표는 스케줄 전량이 필요하다 — 차량 수 × 14 가 상한이라 수백 건 이내(§5.10 `size` 상한 500, Ruling 818).
const ALL_SIZE = 500;
const BUS_SIZE = 100;
const DIRECTION_LABEL: Record<ScheduleDirection, string> = { to_academy: "등원", from_academy: "하원" };
const MAX_NAMES = 2;

// 서버가 `HH:mm` 으로 주는 출발 시각 — 날짜 없는 값이라 그대로 앞 5자리를 쓴다.
const hhmm = (departTime: string) => departTime.slice(0, 5);
const label = (schedule: ScheduleItemResponseTypes) => `${schedule.busNo} · ${WEEKDAY_LABEL[schedule.weekday]} · ${DIRECTION_LABEL[schedule.direction]} ${hhmm(schedule.departTime)}`;
const namesOf = (schedules: ScheduleItemResponseTypes[]) => {
  const shown = schedules.slice(0, MAX_NAMES).map(label).join(" / ");
  return schedules.length > MAX_NAMES ? `${shown} 외 ${schedules.length - MAX_NAMES}건` : shown;
};
type ScheduleListProps = {
  /** 헤더의 [스케줄 등록] 이 여는 등록 창 — 화면(탭 + 헤더)이 쥔다. 안 주면 이 목록이 스스로 쥔다 */
  creating?: boolean;
  onCreatingChange?: (next: boolean) => void;
};

// §5.10 GET /staff/schedules(SCH-01, A-09 · `size=500` 으로 전량) — 정규 스케줄 요일표 · 목록 보기 · 등록·수정·삭제.
// 상세 GET 이 사양에 없어(bus 관리와 같은 형태) 수정은 이 목록의 행 데이터를 그대로
// 옆 패널에 채운다(판단 근거, 보고서 §1).
export const ScheduleList = ({ creating: creatingProp, onCreatingChange }: ScheduleListProps = {}) => {
  const [items, setItems] = useState<ScheduleItemResponseTypes[]>([]);
  const [buses, setBuses] = useState<BusItemResponseTypes[]>([]);
  const [todayRuns, setTodayRuns] = useState<RunItemResponseTypes[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busId, setBusId] = useState("");
  const [direction, setDirection] = useState<"" | ScheduleDirection>("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editing, setEditing] = useState<ScheduleItemResponseTypes | undefined>(undefined);
  const [ownCreating, setOwnCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copying, setCopying] = useState<ScheduleItemResponseTypes | undefined>(undefined);
  const [today] = useState(() => todayInSeoul());
  const creating = creatingProp ?? ownCreating;
  const setCreating = onCreatingChange ?? setOwnCreating;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSchedules(0, ALL_SIZE);
      setItems(data.items);
      setTruncated(data.hasNext);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "운행 스케줄을 불러오지 못했습니다");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // 차량 머리 줄(차량번호 · 운행 불가) · 차량 필터 · 수정 미리보기의 오늘 회차 — 보조 정보라 못 받아도 표는 그대로 쓴다.
  useEffect(() => {
    let alive = true;
    getBuses(0, BUS_SIZE).then((data) => alive && setBuses(data.items)).catch(() => undefined);
    getRuns(today).then((data) => alive && setTodayRuns(data.items)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [today]);

  const handleDone = () => {
    setEditing(undefined);
    setCreating(false);
    setCopying(undefined);
    load();
  };

  const handleDeleted = () => {
    setDeletingId(null);
    setEditing(undefined);
    load();
  };

  const gridBuses = useMemo(() => {
    const known = new Map<string, GridBus>(buses.map((bus) => [bus.id, { id: bus.id, busNo: bus.busNo, plateNo: bus.plateNo, operable: bus.operable }]));
    items.forEach((schedule) => {
      if (!known.has(schedule.busId)) known.set(schedule.busId, { id: schedule.busId, busNo: schedule.busNo });
    });
    return [...known.values()];
  }, [buses, items]);
  const rows = useMemo(() => buildScheduleGrid(items, gridBuses, { busId: busId || undefined, direction: direction || undefined }), [items, gridBuses, busId, direction]);
  const summary = useMemo(() => summarizeSchedules(items), [items]);
  const visible = items.filter((schedule) => (!busId || schedule.busId === busId) && (!direction || schedule.direction === direction));
  const todayWeekday = weekdayOf(today);
  const todayCount = todayRuns.filter((run) => run.canceledAt === null).length;

  const columns: RosterColumn<ScheduleItemResponseTypes>[] = [
    { key: "busNo", label: "차량" },
    { key: "weekday", label: "요일", render: (row) => WEEKDAY_LABEL[row.weekday] },
    { key: "direction", label: "방향", render: (row) => DIRECTION_LABEL[row.direction] },
    { key: "departTime", label: "출발 시각", render: (row) => hhmm(row.departTime) },
    { key: "route", label: "출발지 · 도착지", render: (row) => `${row.originName} → ${row.destinationName}` },
    {
      key: "active",
      label: "상태",
      render: (row) =>
        row.active ? (
          <StatusChip tone="ok" marker={false} quiet>
            활성
          </StatusChip>
        ) : (
          <StatusChip tone="off" marker={false}>
            비활성
          </StatusChip>
        ),
    },
  ];

  const summaryItems: StatStripItem[] = [
    { label: "정규 스케줄", value: summary.total, unit: "건", detail: `차량 ${summary.busCount}대 × 요일 ${new Set(items.map((item) => item.weekday)).size} × 등원·하원` },
    { label: "비활성", value: summary.inactive, unit: "건", detail: summary.inactive > 0 ? <>{namesOf(summary.inactiveSchedules)}<br />노선 편성도 비활성</> : "비활성 스케줄 없음" },
    {
      label: "오늘 회차",
      value: todayCount,
      unit: "개",
      detail: (
        <>
          내일({WEEKDAY_LABEL[weekdayOf(addDays(today, 1))]}) 회차도 생성 완료
          <br />
          매일 00:05 에 오늘·내일분 생성
        </>
      ),
    },
    {
      label: "노선이 비어 있는 스케줄",
      value: summary.emptyRoute.length,
      unit: "건",
      tone: summary.emptyRoute.length > 0 ? "warn" : "neutral",
      detail:
        summary.emptyRoute.length > 0 ? (
          <>
            {namesOf(summary.emptyRoute)}
            <br />
            편성에 정차지 0곳
          </>
        ) : (
          "모든 활성 스케줄의 편성에 정차지가 있음"
        ),
    },
  ];
  const busOptions = [{ value: "", label: "전체" }, ...gridBuses.map((bus) => ({ value: bus.id, label: bus.busNo }))];

  return (
    <StyledScheduleSection>
      <StatStrip items={summaryItems} />

      <FilterBar summary={`스케줄 ${rows.length * (direction ? 1 : 2)}행 × 7요일`}>
        <FilterGroup label="차량">
          <SegmentedControl aria-label="차량 필터" options={busOptions} value={busId} onChange={setBusId} />
        </FilterGroup>
        <FilterGroup label="방향">
          <SegmentedControl
            aria-label="방향 필터"
            options={[
              { value: "", label: "전체" },
              { value: "to_academy", label: "등원" },
              { value: "from_academy", label: "하원" },
            ]}
            value={direction}
            onChange={(value) => setDirection(value as "" | ScheduleDirection)}
          />
        </FilterGroup>
        <FilterGroup label="보기">
          <SegmentedControl
            aria-label="보기 전환"
            options={[
              { value: "grid", label: "요일표" },
              { value: "list", label: "목록" },
            ]}
            value={view}
            onChange={(value) => setView(value as "grid" | "list")}
          />
        </FilterGroup>
      </FilterBar>

      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {truncated ? <AlertBanner tone="info" title={`스케줄이 ${ALL_SIZE}건을 넘어 앞의 ${ALL_SIZE}건만 보입니다 — 차량 필터로 좁혀 확인하세요`} /> : null}

      <Card flush aria-busy={loading}>
        {view === "list" || error ? (
          <RosterTable hasError={Boolean(error)} onRetry={load} emptyMessage="등록된 스케줄이 없습니다" emptyAction={{ label: "스케줄 등록", onClick: () => setCreating(true) }}
            columns={columns} loading={loading} rows={visible} getRowKey={(row) => row.id} onRowClick={setEditing} />
        ) : (
          <>
            <StyledWeekGrid aria-label="운행 스케줄 요일표">
              <thead>
                <tr>
                  <th scope="col">차량 · 방향 · 구간</th>
                  {WEEKDAYS.map((day) => (
                    <th key={day} scope="col" data-today={day === todayWeekday}>
                      {WEEKDAY_LABEL[day]}
                      {day === todayWeekday ? " · 오늘" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <StyledNoRoute colSpan={8}>
                      등록된 스케줄이 없습니다
                      <Button variant="secondary" size="sm" icon="plus" onClick={() => setCreating(true)}>
                        스케줄 등록
                      </Button>
                    </StyledNoRoute>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <GridBusRows key={row.bus.id} row={row} today={todayWeekday} onOpen={setEditing} />
                ))}
              </tbody>
            </StyledWeekGrid>
            <StyledGridLegend>
              <span>
                <span data-swatch="normal" />
                활성 — 큰 글자는 출발 시각, 작은 글자는 예상 소요
              </span>
              <span>
                <span data-swatch="off" />
                비활성
              </span>
              <span>
                <span data-swatch="empty" />
                노선 편성의 정차지가 0곳
              </span>
            </StyledGridLegend>
          </>
        )}
        <StyledScheduleNote>
          스케줄을 고치면 <b>내일 이후 · 시작 전</b> 회차에 반영됩니다. 오늘 회차는 그대로입니다 — 오늘만 바꾸려면 일일 회차 탭에서 임시로 추가·취소하세요.
        </StyledScheduleNote>
      </Card>

      {editing ? (
        <ScheduleForm
          schedule={editing}
          runs={todayRuns}
          today={today}
          onClose={() => setEditing(undefined)}
          onDone={handleDone}
          onDelete={() => setDeletingId(editing.id)}
          onCopy={() => {
            setCopying(editing);
            setEditing(undefined);
          }}
        />
      ) : null}
      {creating ? <ScheduleForm onClose={() => setCreating(false)} onDone={handleDone} /> : null}
      {copying ? <ScheduleCopyDialog schedule={copying} onClose={() => setCopying(undefined)} onDone={handleDone} /> : null}
      {deletingId !== null ? <ScheduleDeleteDialog scheduleId={deletingId} onCancel={() => setDeletingId(null)} onDeleted={handleDeleted} /> : null}
    </StyledScheduleSection>
  );
};

type GridBusRowsProps = { row: ScheduleGridRow; today: ScheduleWeekday; onOpen: (schedule: ScheduleItemResponseTypes) => void };

// 차량 머리 줄 + 방향별 요일 칸. 스케줄이 하나도 없는 차량은 한 줄 안내.
const GridBusRows = ({ row, today, onOpen }: GridBusRowsProps) => (
  <>
    <tr>
      <StyledBusHead colSpan={8}>
        <b>{row.bus.busNo}</b>
        {row.bus.plateNo}{" "}
        {row.bus.operable === false ? (
          <StatusChip tone="bad" marker>
            운행 불가
          </StatusChip>
        ) : null}
      </StyledBusHead>
    </tr>
    {row.hasSchedules ? (
      row.directions.map((direction) => {
        const sample = Object.values(row.cells[direction]).find(Boolean);
        return (
          <tr key={direction}>
            <StyledDirectionCell scope="row">
              <strong>
                <Icon name="arrow-right" size={14} /> {DIRECTION_LABEL[direction]}
              </strong>
              {sample ? `${sample.originName} → ${sample.destinationName}` : ""}
            </StyledDirectionCell>
            {WEEKDAYS.map((day) => {
              const schedule = row.cells[direction][day];
              return (
                <StyledDayCell key={day} $today={day === today}>
                  {schedule ? (
                    <StyledScheduleCell
                      type="button"
                      $kind={!schedule.active ? "off" : schedule.routeStopCount === 0 ? "empty" : "normal"}
                      aria-label={`${row.bus.busNo} ${WEEKDAY_LABEL[day]}요일 ${DIRECTION_LABEL[direction]} ${hhmm(schedule.departTime)} 스케줄${schedule.active ? "" : " · 비활성"}${schedule.routeStopCount === 0 ? " · 노선 정차지 0곳" : ""}`}
                      onClick={() => onOpen(schedule)}
                    >
                      {hhmm(schedule.departTime)}
                      <small>{!schedule.active ? "비활성" : schedule.routeStopCount === 0 ? "정차지 0곳" : schedule.estDurationMin != null ? `${schedule.estDurationMin}분` : "-"}</small>
                    </StyledScheduleCell>
                  ) : null}
                </StyledDayCell>
              );
            })}
          </tr>
        );
      })
    ) : (
      <tr>
        <StyledNoRoute colSpan={8}>이 차량에는 스케줄이 없습니다</StyledNoRoute>
      </tr>
    )}
  </>
);
