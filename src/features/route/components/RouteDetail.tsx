"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSchedules } from "@/features/schedule";
import type { ScheduleItemResponseTypes } from "@/features/schedule";
import { ApiError } from "@/shared/lib/http";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { AlertBanner, Button, PageHeader, SegmentedControl, Skeleton, SkeletonGroup, StatStrip, Tabs } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import { getRouteDetail, getRoutePath, getRoutes } from "../api";
import type { RouteDetailResponseTypes, RouteListItemResponseTypes, RoutePathResponseTypes, RunDirection, Weekday } from "../types";
import { pathFigures, riderFigures } from "../lib/routeStats";
import { WEEKDAYS } from "../lib/routeGrid";
import { RouteCopyDialog } from "./RouteCopyDialog";
import { RouteDeleteDialog } from "./RouteDeleteDialog";
import { StyledBreadcrumb, StyledRouteDetailActions, StyledRouteDetailLayout, StyledRouteDetailTabs, StyledStatLink } from "./RouteDetail.styled";
import { RouteForm } from "./RouteForm";
import { RouteStopsPanel } from "./RouteStopsPanel";

const WEEKDAY_LABEL: Record<string, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };
const DIRECTION_LABEL: Record<string, string> = { to_academy: "등원", from_academy: "하원" };
const ALL_SIZE = 500;

type RouteDetailProps = {
  routeId: string;
};

type CreateSeed = { busId?: string; weekday?: Weekday; direction?: RunDirection };

// 화면 4 — 고정 노선 편성 · 정차 순서 최적화(§5.9, A-08). 편집 폼(RouteForm)·승하차지 편성
// (RouteStopsPanel)을 이 상세 화면에서 구성한다.
//
// 2026-09-23 사용자 지시 — 회차 경유 지점 지정(§5.15, A-15)을 이 화면에서 뺐다. 이 화면은 이미 한
// 노선으로 들어와서 작업하는 곳이라 "회차를 고르는" 칸이 맞지 않고, 필요한 것은 그 노선의 승하차지를
// 직접 고치는 것이었다(승하차지 추가·수정·삭제 — RouteStopsPanel).
//
// R48 — 같은 차량의 다른 요일 · 방향으로 목록에 돌아가지 않고 옮겨 가는 요일 탭, 지표 4칸(승하차지 · 이용 학생 ·
// 예상 소요 · 연결된 스케줄). 지표 재료(같은 차량의 편성 · 경로 · 스케줄)는 보조 정보라 못 받아도 화면은 그대로 쓴다.
export const RouteDetail = ({ routeId }: RouteDetailProps) => {
  const router = useRouter();
  const [route, setRoute] = useState<RouteDetailResponseTypes | null>(null);
  const [siblings, setSiblings] = useState<RouteListItemResponseTypes[]>([]);
  const [path, setPath] = useState<RoutePathResponseTypes | undefined>(undefined);
  const [schedules, setSchedules] = useState<ScheduleItemResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [creating, setCreating] = useState<CreateSeed | undefined>(undefined);

  // 로딩 표시는 첫 조회 때만 켠다 — 편성 정보를 저장한 뒤 다시 불러올 때 켜면 화면 전체가 "불러오는 중" 으로
  // 바뀌어 아직 저장하지 않은 승하차지 편집(RouteStopsPanel)이 언마운트로 사라진다.
  const load = useCallback(async () => {
    try {
      const detail = await getRouteDetail(routeId);
      setRoute(detail);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "노선 편성을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // 보조 재료 — 못 받아도 해당 지표 칸만 `-` 로 둔다.
  useEffect(() => {
    let alive = true;
    getRoutes(0, ALL_SIZE).then((data) => alive && setSiblings(data.items)).catch(() => undefined);
    getRoutePath(routeId).then((data) => alive && setPath(data)).catch(() => alive && setPath(undefined));
    getSchedules(0, ALL_SIZE).then((data) => alive && setSchedules(data.items)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [routeId]);

  const sameBus = useMemo(() => siblings.filter((item) => route && item.busId === route.busId && item.direction === route.direction), [siblings, route]);

  if (loading)
    return (
      <StyledRouteDetailLayout>
        <SkeletonGroup>
          <Skeleton variant="title" width={240} />
          <Skeleton variant="chart" />
        </SkeletonGroup>
      </StyledRouteDetailLayout>
    );
  if (error && !route) return <AlertBanner tone="missed" title={error} />;
  if (!route) return null;

  const dayLabel = `${route.busNo} · ${WEEKDAY_LABEL[route.weekday]} · ${DIRECTION_LABEL[route.direction]}`;
  const goDay = (day: string) => {
    const target = sameBus.find((item) => item.weekday === day);
    if (target) router.push(`/route/${target.id}`);
    else setCreating({ busId: route.busId, weekday: day as Weekday, direction: route.direction });
  };
  const goDirection = (direction: string) => {
    const target = siblings.find((item) => item.busId === route.busId && item.weekday === route.weekday && item.direction === direction);
    if (target) router.push(`/route/${target.id}`);
    else setCreating({ busId: route.busId, weekday: route.weekday, direction: direction as RunDirection });
  };

  const riders = riderFigures(route.stops);
  const figures = pathFigures(path);
  const schedule = schedules.find((item) => item.busId === route.busId && item.weekday === route.weekday && item.direction === route.direction);
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  const stopsDetail =
    route.stops.length === 0
      ? "정차지를 넣어야 도는 길이 생깁니다"
      : route.direction === "from_academy"
        ? `학원 → ${last.name} · 마지막 하차지가 종점`
        : `${first.name} → 학원 · 첫 승차지가 시점`;
  const summaryItems: StatStripItem[] = [
    { label: "승하차지", value: route.stops.length, unit: "곳", detail: stopsDetail },
    {
      label: "이용 학생",
      value: riders ? riders.total : "-",
      unit: riders ? "명" : undefined,
      detail: riders ? `${WEEKDAY_LABEL[route.weekday]}요일 ${DIRECTION_LABEL[route.direction]} · 정차지당 ${riders.min}–${riders.max}명` : "정차지별 학생 수를 아직 받지 못했습니다",
    },
    {
      label: "예상 소요",
      value: figures ? figures.minutes : "-",
      unit: figures ? "분" : undefined,
      detail: figures ? `도로 ${figures.km}km${figures.computedAt ? ` · 마지막 계산 ${formatClockTime(figures.computedAt)}` : ""}` : "도로 경로가 없어 표시하지 않습니다",
    },
    {
      label: "연결된 스케줄",
      value: schedule ? formatClockTime(schedule.departTime) : "-",
      detail: schedule ? (
        <>
          {WEEKDAY_LABEL[route.weekday]} · {route.busNo} {DIRECTION_LABEL[route.direction]} 출발
          <br />
          <StyledStatLink href={`/schedule?bus=${route.busId}`}>운행 스케줄 보기</StyledStatLink>
        </>
      ) : (
        "같은 차량 · 요일 · 방향의 스케줄이 없습니다"
      ),
    },
  ];

  return (
    <StyledRouteDetailLayout>
      <StyledBreadcrumb aria-label="위치">
        <Link href="/route">고정 노선 편성</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{dayLabel}</span>
      </StyledBreadcrumb>
      <PageHeader
        title={dayLabel}
        description={route.name ?? undefined}
        actions={
          <StyledRouteDetailActions>
            <Button variant="secondary" icon="copy" onClick={() => setCopying(true)}>
              다른 요일에 복사
            </Button>
            <Button variant="secondary" icon="pencil" onClick={() => setEditing(true)}>
              편성 정보 수정
            </Button>
            <Button variant="dangerQuiet" icon="trash-2" onClick={() => setDeleting(true)}>
              삭제
            </Button>
          </StyledRouteDetailActions>
        }
      />

      <StyledRouteDetailTabs>
        <Tabs
          aria-label="요일"
          items={WEEKDAYS.map((day) => ({ value: day, label: WEEKDAY_LABEL[day], count: sameBus.find((item) => item.weekday === day)?.stopCount }))}
          value={route.weekday}
          onChange={goDay}
        />
        <SegmentedControl
          aria-label="방향"
          options={[
            { value: "to_academy", label: "등원" },
            { value: "from_academy", label: "하원" },
          ]}
          value={route.direction}
          onChange={goDirection}
        />
      </StyledRouteDetailTabs>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <StatStrip items={summaryItems} />

      <RouteStopsPanel routeId={routeId} direction={route.direction} />

      {editing ? (
        <RouteForm
          route={route}
          onClose={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            load();
          }}
        />
      ) : null}

      {creating ? (
        <RouteForm
          initial={creating}
          existing={siblings}
          onClose={() => setCreating(undefined)}
          onDone={({ id }) => {
            setCreating(undefined);
            router.push(`/route/${id}`);
          }}
          onBatchDone={() => setCreating(undefined)}
        />
      ) : null}

      {copying ? (
        <RouteCopyDialog
          route={route}
          onClose={() => setCopying(false)}
          onDone={() => {
            setCopying(false);
            router.push("/route");
          }}
        />
      ) : null}

      {deleting ? (
        <RouteDeleteDialog
          routeId={routeId}
          label={dayLabel}
          stopCount={route.stops.length}
          riderCount={riders?.total}
          onCancel={() => setDeleting(false)}
          onDeleted={() => router.push("/route")}
        />
      ) : null}
    </StyledRouteDetailLayout>
  );
};
