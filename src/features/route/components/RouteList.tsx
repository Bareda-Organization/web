"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getBuses } from "@/features/bus";
import type { BusItemResponseTypes } from "@/features/bus";
import { ApiError } from "@/shared/lib/http";
import { WEEKDAY_LABEL } from "@/shared/lib/format/weekdayBatch";
import { AlertBanner, Button, Card, FilterBar, FilterGroup, Icon, PageHeader, RosterTable, SegmentedControl, StatStrip, StatusChip } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getRoutes } from "../api";
import type { RouteListItemResponseTypes, RunDirection, Weekday } from "../types";
import { buildRouteGrid, summarizeRoutes, todayWeekday, WEEKDAYS } from "../lib/routeGrid";
import type { GridBus } from "../lib/routeGrid";
import { RouteForm } from "./RouteForm";
import {
  StyledBusHead,
  StyledDayCell,
  StyledDirectionCell,
  StyledGridLegend,
  StyledNoRoute,
  StyledRouteCell,
  StyledRouteLayout,
  StyledWeekGrid,
} from "./RouteList.styled";

// 요일표는 편성 전량이 필요하다 — 차량 수 × 14 가 상한이라 수백 건 이내(§5.9 size 상한 500).
const ALL_SIZE = 500;
const BUS_SIZE = 100;
const DIRECTION_LABEL: Record<RunDirection, string> = { to_academy: "등원", from_academy: "하원" };
const DIRECTION_FLOW: Record<RunDirection, string> = { to_academy: "승차지 → 학원", from_academy: "학원 → 하차지" };
const MAX_NAMES = 2;

type CreateSeed = { busId?: string; weekday?: Weekday; direction?: RunDirection };

const routeLabel = (route: RouteListItemResponseTypes) => `${route.busNo} · ${WEEKDAY_LABEL[route.weekday]} · ${DIRECTION_LABEL[route.direction]}`;
const namesOf = (routes: RouteListItemResponseTypes[]) => {
  const shown = routes.slice(0, MAX_NAMES).map(routeLabel).join(" / ");
  return routes.length > MAX_NAMES ? `${shown} 외 ${routes.length - MAX_NAMES}건` : shown;
};

// §5.9 GET /staff/routes(RTE-01, §1.8 페이징 `size=500` 으로 전량) — 고정 노선 편성. 비활성 편성도
// 실린다(편성 이력 보존). 요일표 칸 또는 목록의 행 클릭으로 정차 순서 관리 화면(RouteStopsPanel)으로 이동.
export const RouteList = () => {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteListItemResponseTypes[]>([]);
  const [buses, setBuses] = useState<BusItemResponseTypes[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busId, setBusId] = useState("");
  const [direction, setDirection] = useState<"" | RunDirection>("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [creating, setCreating] = useState<CreateSeed | undefined>(undefined);
  const [today] = useState(() => todayWeekday());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRoutes(0, ALL_SIZE);
      setRoutes(data.items);
      setTruncated(data.hasNext);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "노선 편성 목록을 불러오지 못했습니다");
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // 차량 머리 줄(차량번호 · 운행 불가)과 차량 필터 — 못 받아도 편성에 실린 호차 이름으로 그린다.
  useEffect(() => {
    let alive = true;
    getBuses(0, BUS_SIZE)
      .then((data) => alive && setBuses(data.items))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const gridBuses = useMemo(() => {
    const known = new Map<string, GridBus>(buses.map((bus) => [bus.id, { id: bus.id, busNo: bus.busNo, plateNo: bus.plateNo, operable: bus.operable }]));
    routes.forEach((route) => {
      if (!known.has(route.busId)) known.set(route.busId, { id: route.busId, busNo: route.busNo });
    });
    return [...known.values()];
  }, [buses, routes]);
  const rows = useMemo(() => buildRouteGrid(routes, gridBuses, { busId: busId || undefined, direction: direction || undefined }), [routes, gridBuses, busId, direction]);
  const summary = useMemo(() => summarizeRoutes(routes), [routes]);
  const visibleRoutes = routes.filter((route) => (!busId || route.busId === busId) && (!direction || route.direction === direction));

  const open = (route: RouteListItemResponseTypes) => router.push(`/route/${route.id}`);

  const columns: RosterColumn<RouteListItemResponseTypes>[] = [
    { key: "busNo", label: "차량" },
    { key: "weekday", label: "요일", render: (row) => WEEKDAY_LABEL[row.weekday] },
    { key: "direction", label: "방향", render: (row) => DIRECTION_LABEL[row.direction] },
    { key: "name", label: "편성 이름", render: (row) => row.name ?? "-" },
    // B1 #10 — 정차지를 아직 안 넣은 빈 편성(0곳)을 목록에서 가른다.
    { key: "stopCount", label: "정차지 수", render: (row) => `${row.stopCount}곳` },
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

  const busDays = new Set(routes.map((route) => route.weekday)).size;
  const summaryItems: StatStripItem[] = [
    { label: "편성", value: summary.total, unit: "건", detail: `차량 ${summary.busCount}대 × 요일 ${busDays} × 등원·하원` },
    { label: "활성", value: summary.active, unit: "건", detail: "출발 30분 전 확정 노선의 바탕이 되는 편성" },
    { label: "비활성", value: summary.inactive, unit: "건", detail: summary.inactive > 0 ? namesOf(summary.inactiveRoutes) : "이력으로만 남은 편성 없음" },
    {
      label: "정차지 0곳",
      value: summary.empty.length,
      unit: "건",
      tone: summary.empty.length > 0 ? "warn" : "neutral",
      detail:
        summary.empty.length > 0 ? (
          <>
            {namesOf(summary.empty)}
            <br />
            정차지를 넣기 전엔 도는 길이 없음
          </>
        ) : (
          "모든 활성 편성에 정차지가 있음"
        ),
    },
  ];

  const busOptions = [{ value: "", label: "전체" }, ...gridBuses.map((bus) => ({ value: bus.id, label: bus.busNo }))];

  return (
    <StyledRouteLayout>
      <PageHeader
        title="고정 노선 편성"
        description={error ? undefined : "차량 · 요일 · 방향별 정차 순서 — 칸을 누르면 그 편성의 정차지를 편집합니다"}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating({})}>
            편성 등록
          </Button>
        }
      />

      <StatStrip items={summaryItems} />

      <FilterBar summary={`차량 ${rows.length}대 · 편성 ${rows.length * (direction ? 1 : 2)}행 × 7요일`}>
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
            onChange={(value) => setDirection(value as "" | RunDirection)}
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
      {truncated ? <AlertBanner tone="info" title={`편성이 ${ALL_SIZE}건을 넘어 앞의 ${ALL_SIZE}건만 보입니다 — 차량 필터로 좁혀 확인하세요`} /> : null}

      <Card flush aria-busy={loading}>
        {view === "list" || error ? (
          <RosterTable hasError={Boolean(error)} onRetry={load} emptyMessage="등록된 편성이 없습니다" emptyAction={{ label: "편성 등록", onClick: () => setCreating({}) }}
            columns={columns}
            loading={loading}
            rows={visibleRoutes}
            getRowKey={(row) => row.id}
            onRowClick={open}
          />
        ) : (
          <>
            <StyledWeekGrid aria-label="고정 노선 편성 요일표">
              <thead>
                <tr>
                  <th scope="col">차량 · 방향</th>
                  {WEEKDAYS.map((day) => (
                    <th key={day} scope="col" data-today={day === today}>
                      {WEEKDAY_LABEL[day]}
                      {day === today ? " · 오늘" : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <StyledNoRoute colSpan={8}>등록된 편성이 없습니다</StyledNoRoute>
                  </tr>
                ) : null}
                {rows.map((row) => (
                  <GridBusRows key={row.bus.id} row={row} today={today} onOpen={open} onAdd={(seed) => setCreating(seed)} />
                ))}
              </tbody>
            </StyledWeekGrid>
            <StyledGridLegend>
              <span>
                <span data-swatch="normal" />
                활성 — 칸의 숫자는 정차지 수
              </span>
              <span>
                <span data-swatch="off" />
                비활성 — 이력으로만 남은 편성
              </span>
              <span>
                <span data-swatch="empty" />
                정차지 0곳 (운행 노선이 비어 있음)
              </span>
              <em>칸을 누르면 그 편성의 정차지를 편집합니다</em>
            </StyledGridLegend>
          </>
        )}
      </Card>

      {creating ? (
        <RouteForm
          initial={creating}
          existing={routes}
          onClose={() => setCreating(undefined)}
          // 저장하면 만든 편성의 상세로 이어 간다 — 정차지를 넣는 것이 다음 일이다(B1 #10).
          onDone={({ id }) => {
            setCreating(undefined);
            router.push(`/route/${id}`);
          }}
          // 요일을 여러 개 골라 만들었으면 상세로 이어 갈 한 건이 없다 — 목록을 다시 읽는다.
          onBatchDone={() => {
            setCreating(undefined);
            load();
          }}
        />
      ) : null}
    </StyledRouteLayout>
  );
};

type GridBusRowsProps = {
  row: ReturnType<typeof buildRouteGrid>[number];
  today: Weekday;
  onOpen: (route: RouteListItemResponseTypes) => void;
  onAdd: (seed: CreateSeed) => void;
};

// 차량 머리 줄 + 방향별 요일 칸. 편성이 하나도 없는 차량은 한 줄 안내 + [편성 만들기].
const GridBusRows = ({ row, today, onOpen, onAdd }: GridBusRowsProps) => (
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
    {row.hasRoutes ? (
      row.directions.map((direction) => (
        <tr key={direction}>
          <StyledDirectionCell scope="row">
            <strong>
              <Icon name="arrow-right" size={14} /> {DIRECTION_LABEL[direction]}
            </strong>
            {DIRECTION_FLOW[direction]}
          </StyledDirectionCell>
          {WEEKDAYS.map((day) => {
            const route = row.cells[direction][day];
            const label = `${row.bus.busNo} ${WEEKDAY_LABEL[day]}요일 ${DIRECTION_LABEL[direction]}`;
            return (
              <StyledDayCell key={day} $today={day === today}>
                {route ? (
                  <StyledRouteCell
                    type="button"
                    $kind={!route.active ? "off" : route.stopCount === 0 ? "empty" : "normal"}
                    aria-label={`${label} 편성 — 정차지 ${route.stopCount}곳${route.active ? "" : " · 비활성"}`}
                    onClick={() => onOpen(route)}
                  >
                    {route.stopCount}곳
                    {!route.active ? <small>비활성</small> : route.stopCount === 0 ? <small>정차지 없음</small> : null}
                  </StyledRouteCell>
                ) : (
                  <StyledRouteCell type="button" $kind="add" aria-label={`${label} 편성 만들기`} onClick={() => onAdd({ busId: row.bus.id, weekday: day, direction })}>
                    +
                  </StyledRouteCell>
                )}
              </StyledDayCell>
            );
          })}
        </tr>
      ))
    ) : (
      <tr>
        <StyledNoRoute colSpan={8}>
          이 차량에는 편성이 없습니다
          <Button variant="secondary" size="sm" icon="plus" onClick={() => onAdd({ busId: row.bus.id })}>
            편성 만들기
          </Button>
        </StyledNoRoute>
      </tr>
    )}
  </>
);
