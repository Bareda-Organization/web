"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { usePolling } from "@/shared/hooks";
import { AlertBanner, Badge, Button, Card, PageHeader, RosterTable, StatusPill } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import {
  MapSurface,
  anchorForSelection,
  buildRouteDisplayState,
  cameraForSelectedBus,
  type MapCamera,
  type MapMarker,
  type MapPolyline,
} from "@/features/map";
import { getRunRoute } from "@/features/route";
import { formatClockTime, formatClockTimeWithSeconds } from "@/shared/lib/format/clockTime";
import { getDashboard, getRunRoster, getRunsLive } from "../api";
import type {
  DashboardRunResponseTypes,
  RosterItemResponseTypes,
  RosterStatus,
  RunLiveItemResponseTypes,
  RunStatus,
} from "../types";
import { ForcedAddDialog } from "./ForcedAddDialog";
import { ManagerAssignmentDialog } from "./ManagerAssignmentDialog";
import { RouteAckMark } from "./RouteAckMark";
import { StudentTransferDialog } from "./StudentTransferDialog";
import { TransferCancelDialog } from "./TransferCancelDialog";
import {
  StyledTodayRunLayout,
  StyledMapTopRow,
  StyledMapPane,
  StyledFallbackNotice,
  StyledMapOverlayNotice,
  StyledBusListPane,
  StyledBusListItem,
  StyledBusListItemHeader,
  StyledContentGrid,
  StyledSidePanel,
  StyledMapSurface,
  StyledCrewRow,
  StyledCrewLabel,
  StyledStopRosterRow,
  StyledStopRosterName,
  StyledStopRosterClass,
  StyledStopRosterEmpty,
  StyledStopRosterHeader,
  StyledRosterScroll,
} from "./TodayRunPage.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";

// DashboardPage.tsx·MonitoringPage.tsx 와 같은 기본 좌표(서울 시청). `DashboardRunResponseTypes`·
// `RosterItemResponseTypes` 는 좌표 필드가 없지만(승하차지는 `stopName` 문자열만 응답에 실린다 —
// `run/types/index.ts`), `§5.18 GET /staff/runs/live`(`getRunsLive`)는 선택된 회차가 이동 중이면
// `position{lat,lng}` 을 준다 — 버스 마커는 그 응답에서 채운다(판단 근거, 보고서 §1). 위치
// 미수신 상태(`position=null`)에서는 지도가 이 기본 좌표를 그대로 보여준다.
const DEFAULT_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

// DashboardPage.tsx 와 같은 7초 — 종료되지 않은 회차는 화면을 열어 둔 동안 이 주기로 다시 불러온다(F01-03).
const LIVE_POLL_INTERVAL_MS = 7000;

// §5.4 응답의 `absent` 는 매니저 앱과 반대로 계속 빨간색(missed)으로 유지해야 한다
// (API_SPEC §5.4) — 공용 StudentRow 의 RIDE_META 는 absent 를 idle 로 다뤄서 여기선
// 안 쓰고 화면 전용 매핑을 둔다(판단 근거, 보고서 §1).
const STATUS_LABEL: Record<RosterStatus, string> = {
  waiting: "대기",
  boarded: "탑승 완료",
  alighted: "하차 완료",
  absent: "미등원",
  no_show: "미승차",
};

const STATUS_PILL: Record<RosterStatus, "boarded" | "moving" | "missed" | "idle"> = {
  waiting: "idle",
  boarded: "boarded",
  alighted: "boarded",
  absent: "missed",
  no_show: "missed",
};

// 예정 명단에서 승하차지가 아직 정해지지 않은 학생(`stopName` null, §5.4)의 표기 — 표 칸과 묶음 머리줄이 같다.
const UNASSIGNED_STOP = "승하차지 미지정";

const DIRECTION_LABEL: Record<DashboardRunResponseTypes["direction"], string> = {
  to_academy: "등원",
  from_academy: "하원",
};

// R15-T2 §8.23 목표 3 — DashboardPage.tsx 와 같은 표기(대기·확정·운행 중·운행 종료).
// finished 도 이 화면의 우측 버스 목록에서 걸러내지 않는다.
const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  idle: "대기",
  confirmed: "확정",
  moving: "운행 중",
  finished: "운행 종료",
};

// R20-C 목표 2 — 확정·대기가 같은 색이었다(둘 다 "idle" 톤, 사용자 지적). `StatusPill`
// 의 색 4종(그린·앰버·레드·스톤, C-09)은 고정이라 새로 만들 수 없어 남은 한 톤인
// "missed"(레드)를 확정에 배정한다 — 라벨은 `RUN_STATUS_LABEL`("확정")로 덮어써
// "미탑승"으로 읽히지 않는다.
const RUN_STATUS_TO_PILL: Record<RunStatus, "boarded" | "moving" | "missed" | "idle"> = {
  idle: "idle",
  confirmed: "missed",
  moving: "moving",
  finished: "boarded",
};

// §5.4 GET /staff/runs/{runId}/roster(A-06) · §5.7 POST .../forced-add(A-07) ·
// §5.8 POST /staff/students/{id}/transfer(A-07, R34-W1) · §5.14 PATCH .../assignment(A-06) —
// 금일 운행 상세(UF-M-03·UF-M-04).
export const TodayRunPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get("runId");

  const [runs, setRuns] = useState<DashboardRunResponseTypes[]>([]);
  const [runsLoaded, setRunsLoaded] = useState(false);
  const [roster, setRoster] = useState<RosterItemResponseTypes[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forcedAddOpen, setForcedAddOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  // A-07 — [다른 버스로]를 누른 학생. null 이면 대화상자가 닫혀 있다.
  const [transferTarget, setTransferTarget] = useState<RosterItemResponseTypes | null>(null);
  // A-07 — [이동 취소]를 누른 이동 대기 학생(§5.8.1). null 이면 확인 대화상자가 닫혀 있다.
  const [cancelTarget, setCancelTarget] = useState<(RosterItemResponseTypes & { transferId: string }) | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [liveRun, setLiveRun] = useState<RunLiveItemResponseTypes | null>(null);
  // R15-T2 — 우측 버스 목록에서 고른(=지금 화면에 뜬) 회차의 노선.
  const [routePolylines, setRoutePolylines] = useState<MapPolyline[]>([]);
  const [routeFallback, setRouteFallback] = useState(false);
  // R18-B2 목표 2 — MonitoringPage.tsx·DashboardPage.tsx 와 같은 형태.
  const [routeMissing, setRouteMissing] = useState(false);
  // Ruling 321 — idle 회차인데 고정 노선(예정 경로)조차 없는 상태(정상,
  // MonitoringPage.tsx·DashboardPage.tsx 와 같은 형태).
  const [routeNoPlannedRoute, setRouteNoPlannedRoute] = useState(false);
  // Ruling 321 — 고정 노선 기반 "예정" 경로가 그려졌다. 확정 시점에 재계산돼 달라질 수 있다.
  const [routePlanned, setRoutePlanned] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  // R19 목표 1 — 지금 화면에 뜬 회차의 정차지 마커(MonitoringPage.tsx 와 같은 형태).
  // 이 화면은 선택 해제 토글이 없어(항상 회차 하나) 비우는 시점도 없다.
  const [routeStopMarkers, setRouteStopMarkers] = useState<MapMarker[]>([]);
  // R24 — 지도에서 고른 승하차지. 지도 마커는 좌표만 들고 있어서 명단과 이으려면
  // 정차지 이름이 필요하다(§5.4 명단 항목은 `stopName` 문자열만 싣는다) — 노선 응답의
  // 정차지 목록을 그대로 보관해 id → 이름을 되찾는다.
  const [routeStops, setRouteStops] = useState<{ stopId: string; name: string }[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const selectedRunId = runIdParam ?? (runs[0]?.runId ?? null);
  const selectedRun = useMemo(() => runs.find((run) => run.runId === selectedRunId) ?? null, [runs, selectedRunId]);
  // 명단·위치·노선 조회의 의존성은 회차 객체가 아니라 이 원시값이다 — 회차 목록을 다시 받을 때마다 배열이 새로
  // 만들어져도 값이 같으면 다시 부르지 않는다(F01-04).
  const selectedRunStatus = selectedRun?.runStatus ?? null;
  // 오늘 회차가 하나도 없으면 명단을 부를 일이 없어 불러오는 중 표시를 끈다.
  const isLoading = loading && !(runsLoaded && selectedRunId == null);
  const firstRunId = runs[0]?.runId ?? null;
  // A-07(UF-M-04) — 확정 전(①구간, idle) 회차에서만 학생을 다른 버스로 옮길 수 있고, 도착 회차는
  // 같은 날짜(이 화면은 오늘)·같은 방향의 확정 전 다른 버스다. 확정된 회차는 추가에 해당해 막힌다.
  const canTransfer = selectedRun?.runStatus === "idle";
  const transferCandidates = useMemo(
    () =>
      selectedRun
        ? runs.filter((run) => run.runId !== selectedRun.runId && run.direction === selectedRun.direction && run.runStatus === "idle")
        : [],
    [runs, selectedRun],
  );

  // R21-A 목표 1~3 — 이 화면은 항상 회차 하나만 보여 그 버스가 곧 "선택된" 버스다
  // (MonitoringPage.tsx·DashboardPage.tsx 와 달리 선택 해제 토글이 없다).
  const mapMarkers: MapMarker[] = useMemo(
    () =>
      liveRun?.position
        ? [
            {
              id: String(liveRun.runId),
              lat: liveRun.position.lat,
              lng: liveRun.position.lng,
              kind: "bus" as const,
              selected: true,
              busNo: liveRun.busNo,
              direction: liveRun.direction,
            },
          ]
        : [],
    [liveRun],
  );
  // R24 — 지도에서 고른 승하차지의 이름. 명단(§5.4)은 승하차지를 **이름 문자열**로만
  // 싣기 때문에(id 가 부재) 이 이름이 둘을 잇는 유일한 열쇠다. 둘 다 `stop.name` 한 컬럼에서
  // 나오므로 같은 정차지면 반드시 일치한다.
  // ⚠ 한 노선에 같은 이름의 승하차지가 둘 있으면 두 곳의 학생이 함께 나온다. 그때 가르려면
  // 명단 응답에 `stop_id` 를 더해야 한다(API 계약 변경) — 지금은 그런 자료가 부재해 두지 않는다.
  const selectedStopName = useMemo(
    () => routeStops.find((stop) => stop.stopId === selectedStopId)?.name ?? null,
    [routeStops, selectedStopId],
  );
  const stopRoster = useMemo(
    () => (selectedStopName == null ? [] : roster.filter((item) => item.stopName === selectedStopName)),
    [roster, selectedStopName],
  );
  // 고른 승하차지에 흰 테두리를 둘러 "이 자리를 보고 있다"를 지도에서도 알린다.
  const highlightedStopMarkers = useMemo(
    () =>
      routeStopMarkers.map((marker) =>
        marker.id === `stop-${selectedStopId}` ? { ...marker, selected: true } : marker,
      ),
    [routeStopMarkers, selectedStopId],
  );
  // 지도 마커 클릭 — 승하차지만 받는다. 버스·출발지·도착지를 누르면 선택을 해제한다
  // (같은 승하차지를 다시 누르는 것도 해제다 — 목록에서 벗어날 수단이 필요하다).
  const handleSelectMarker = useCallback((markerId: string) => {
    const stopId = markerId.startsWith("stop-") ? markerId.slice("stop-".length) : null;
    setSelectedStopId((previous) => (stopId == null || stopId === previous ? null : stopId));
  }, []);

  // R19 목표 1 — 지도에 실제로 그리는 마커 = 버스 + 선택된 회차의 정차지.
  const mapMarkersWithStops: MapMarker[] = useMemo(
    () => [...mapMarkers, ...highlightedStopMarkers],
    [mapMarkers, highlightedStopMarkers],
  );

  // R18-B2 목표 2 — 이 화면은 항상 회차 하나가 선택돼 있다(대기 상태가 없다,
  // 선택 해제 토글 부재). 마커가 있으면 곧 "선택된 버스" 라 세 화면이 공유하는
  // `cameraForSelectedBus`(`features/map`)를 그대로 쓴다 — 새 분기를 만들지 않는다.
  // R21-A 목표 4 — 이 회차에 실시간 위치가 없으면(idle·확정·종료) `mapMarkers` 가
  // 비어 카메라가 정차지 쪽으로 못 옮겨갔다 — 정차지 평균 좌표를 대신 쓴다.
  const mapCamera: MapCamera = useMemo(
    () => cameraForSelectedBus(anchorForSelection(mapMarkers[0] ?? null, routeStopMarkers), DEFAULT_CAMERA),
    [mapMarkers, routeStopMarkers],
  );

  // silent — 주기 갱신. 실패해도 이미 뜬 화면을 오류로 덮지 않는다.
  // 돌려주는 값은 폴링용 성공 여부다(`usePolling` 이 실패하면 간격을 늘린다).
  const loadRuns = useCallback(async (silent = false): Promise<boolean> => {
    try {
      const data = await getDashboard();
      setRuns(data.runs);
      setRunsLoaded(true);
      return true;
    } catch (cause) {
      if (!silent) {
        setError(cause instanceof ApiError ? cause.message : "회차 목록을 불러오지 못했습니다");
        setLoading(false);
      }
      return false;
    }
  }, []);

  // 요청 번호 — 회차를 바꾸기 전에 나간 요청의 늦은 응답이 새 회차의 값을 덮지 않게 최신 요청만 반영한다(F01-05).
  const rosterSeq = useRef(0);
  const liveSeq = useRef(0);
  const routeSeq = useRef(0);

  const loadRoster = useCallback(async (runId: string, silent = false): Promise<boolean> => {
    const mine = ++rosterSeq.current;
    if (!silent) setLoading(true);
    try {
      const items = await getRunRoster(runId);
      if (mine !== rosterSeq.current) return true;
      setRoster(items);
      setError(null);
      return true;
    } catch (cause) {
      if (mine !== rosterSeq.current) return false;
      setError(cause instanceof ApiError ? cause.message : "명단을 불러오지 못했습니다");
      // 주기 갱신이 한 번 실패했다고 보이던 명단을 지우지 않는다.
      if (!silent) setRoster([]);
      return false;
    } finally {
      if (mine === rosterSeq.current) setLoading(false);
    }
  }, []);

  // §5.18 은 `status='moving'` 인 회차만 돌려준다 — 선택된 회차가 없으면(대기·종료)
  // `liveRun` 은 null 로 남고 지도는 기본 좌표를 보여준다. 위치 카드는 보조 정보라
  // 실패해도 본문 오류로 승격하지 않는다(DashboardPage.tsx 의 loadLive 와 같은 판단).
  const loadLiveRun = useCallback(async (runId: string, silent = false): Promise<boolean> => {
    const mine = ++liveSeq.current;
    try {
      const data = await getRunsLive();
      if (mine !== liveSeq.current) return true;
      setLiveRun(data.runs.find((run) => run.runId === runId) ?? null);
      return true;
    } catch {
      if (mine === liveSeq.current && !silent) setLiveRun(null);
      return false;
    }
  }, []);

  // R15-T2 목표 4 — 지금 화면에 뜬 회차의 §5.19 노선을 지도에 그린다. 이 화면은
  // 항상 회차 하나가 선택된 상태라(대기 상태가 없다) DashboardPage.tsx 와 달리
  // 선택 해제 토글은 두지 않는다(보고서 §2, 판단 근거).
  // R20-C 목표 4 — "아직 확정 전"과 "확정됐는데 경로가 없음"을 가르려면 회차
  // 상태가 필요하다(호출부가 `selectedRun.runStatus` 를 넘긴다).
  const loadRoute = useCallback(async (runId: string, runStatus: RunStatus) => {
    const mine = ++routeSeq.current;
    setRouteError(null);
    try {
      const route = await getRunRoute(runId);
      if (mine !== routeSeq.current) return;
      // R18-B2 — 좌표 0개=데이터 부재, 근사 경로 안내는 실제로 그려졌을 때만 켜는
      // 판단을 `features/map`(`buildRouteDisplayState`)이 세 화면 몫을 한 곳에서 한다.
      const display = buildRouteDisplayState(runId, runStatus, route);
      setRoutePolylines(display.polylines);
      setRouteFallback(display.fallback);
      setRouteMissing(display.missing);
      setRouteNoPlannedRoute(display.noPlannedRoute);
      setRoutePlanned(display.planned);
      setRouteStopMarkers(display.stopMarkers);
      setRouteStops(route.stops.map((stop) => ({ stopId: stop.stopId, name: stop.name })));
      setSelectedStopId(null);
    } catch (cause) {
      if (mine !== routeSeq.current) return;
      setRoutePolylines([]);
      setRouteFallback(false);
      setRouteMissing(false);
      // C00-03 — 고정 노선이 없는 확정 전 회차는 §5.19 가 409 RUN_NOT_CONFIRMED 를 준다. 원문을 띠로 내면
      // "확정을 기다리면 된다" 로 읽히므로 고정 노선 부재 안내로 바꾼다.
      setRouteNoPlannedRoute(cause instanceof ApiError && cause.code === "RUN_NOT_CONFIRMED");
      setRoutePlanned(false);
      setRouteStopMarkers([]);
      setRouteStops([]);
      setSelectedStopId(null);
      if (!(cause instanceof ApiError && cause.code === "RUN_NOT_CONFIRMED")) {
        setRouteError(cause instanceof ApiError ? cause.message : "노선을 불러오지 못했습니다");
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadRuns();
    })();
  }, [loadRuns]);

  // 사이드바로 들어와 회차 번호가 주소에 없으면 첫 회차를 기본으로 고른다. 주소의 최신 값을 보고 판단해야
  // 하므로 loadRuns 안이 아니라 렌더 값에 의존하는 이 effect 에 둔다(C00-01 — 옛 null 을 붙든 채
  // 조작 뒤 재조회가 선택을 첫 회차로 되돌렸다).
  useEffect(() => {
    if (!runIdParam && firstRunId) router.replace(`/today-run?runId=${firstRunId}`);
  }, [runIdParam, firstRunId, router]);

  useEffect(() => {
    if (selectedRunId == null) return;
    (async () => {
      await Promise.all([loadRoster(selectedRunId), loadLiveRun(selectedRunId)]);
    })();
  }, [selectedRunId, loadRoster, loadLiveRun]);

  // 회차 목록이 온 뒤(상태를 안 뒤)에만 노선을 그린다 — 상태 없이 그리면 확정 노선이 색을 못 받아 선이 사라진다(F01-04).
  useEffect(() => {
    if (selectedRunId == null || selectedRunStatus == null) return;
    (async () => {
      await loadRoute(selectedRunId, selectedRunStatus);
    })();
  }, [selectedRunId, selectedRunStatus, loadRoute]);

  // F01-03 — 종료되지 않은 회차는 화면을 열어 둔 동안 회차 상태·명단·위치를 다시 불러온다. 표를 '불러오는 중' 으로
  // 뒤집지 않도록 전부 silent 다.
  // 응답을 받은 뒤 다음 요청을 예약한다 — 명단 조회는 서버가 호출마다 감사 기록을 남기므로 요청이 겹치면 기록도 겹친다.
  // 숨은 탭에서는 멈추고 실패하면 간격을 늘린다. 간격(7초) 자체는 그대로다(R46-WEB C).
  usePolling(
    async () => {
      if (selectedRunId == null) return true;
      const results = await Promise.all([loadRuns(true), loadRoster(selectedRunId, true), loadLiveRun(selectedRunId, true)]);
      return results.every(Boolean);
    },
    LIVE_POLL_INTERVAL_MS,
    selectedRunId != null && selectedRunStatus != null && selectedRunStatus !== "finished",
  );

  const columns: RosterColumn<RosterItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "className", label: "반", render: (row) => row.className ?? "-" },
    { key: "stopName", label: "승하차지", render: (row) => row.stopName ?? UNASSIGNED_STOP },
    { key: "guardianPhone", label: "보호자 연락처", render: (row) => row.guardianPhone ?? "-" },
    {
      // R21-B 목표 2·3·4 — DashboardPage.tsx 와 같은 표기(예정/실제 구분, 시:분:초).
      // 이 표는 학생 단위 행이지만 회차 단위 값이라 모든 행에 같은 값이 반복된다 —
      // `selectedRun`(회차 하나만 선택된 이 화면의 전제, 위 주석)을 그대로 참조한다.
      key: "departTime",
      label: "출발",
      render: () =>
        selectedRun ? (
          <>
            예정 {formatClockTimeWithSeconds(selectedRun.departTime)}
            {selectedRun.startedAt ? (
              <>
                <br />
                실제 {formatClockTimeWithSeconds(selectedRun.startedAt)}
              </>
            ) : null}
          </>
        ) : (
          "-"
        ),
    },
    {
      // R21-B2 목표 1·2 — DashboardPage.tsx 와 같은 표기(예정/실제, est_arrival_time 없으면 "-").
      key: "finishedAt",
      label: "도착",
      render: () => (
        <>
          예정 {selectedRun?.estArrivalTime ? formatClockTimeWithSeconds(selectedRun.estArrivalTime) : "-"}
          {selectedRun?.finishedAt ? (
            <>
              <br />
              실제 {formatClockTimeWithSeconds(selectedRun.finishedAt)}
            </>
          ) : null}
        </>
      ),
    },
    {
      key: "change",
      label: "변경",
      render: (row) =>
        row.change ? (
          <Badge tone={row.change === "added" ? "added" : "removed"}>
            {row.change === "added" ? "추가" : "제외"}
          </Badge>
        ) : (
          "-"
        ),
    },
    {
      key: "status",
      label: "탑승 현황",
      render: (row) => <StatusPill status={STATUS_PILL[row.status]}>{STATUS_LABEL[row.status]}</StatusPill>,
    },
    {
      key: "transfer",
      label: "조정",
      // 이동 대기 행(transferId)은 다시 옮기면 서버가 TRANSFER_ALREADY_STAGED 로 거절한다(§5.8) —
      // [다른 버스로] 대신 [이동 취소] 만 둔다. 취소한 뒤 다시 옮길 수 있다.
      render: (row) => {
        const { transferId } = row;
        if (transferId != null) {
          return (
            <Button variant="ghost" size="sm" onClick={() => setCancelTarget({ ...row, transferId })}>
              이동 취소
            </Button>
          );
        }
        return canTransfer && row.change !== "removed" ? (
          <Button variant="ghost" size="sm" onClick={() => setTransferTarget(row)}>
            다른 버스로
          </Button>
        ) : null;
      },
    },
  ];

  return (
    <StyledTodayRunLayout>
      <PageHeader
        title="금일 운행 상세"
        description="회차별 탑승 명단과 배치 현황을 확인합니다"
        actions={
          selectedRun ? (
            <>
              <Button variant="secondary" onClick={() => setAssignmentOpen(true)}>
                매니저 배치 변경
              </Button>
              {/* §5.7 — 강제 추가는 ①구간(확정 전) 전용이다. 확정된 회차는 끝까지 입력한 뒤에야 403 을 받게 되므로 미리 막는다. */}
              <Button
                variant="primary"
                disabled={!canTransfer}
                title={canTransfer ? undefined : "확정된 회차에는 추가할 수 없습니다 (출발 30분 전까지만)"}
                onClick={() => setForcedAddOpen(true)}
              >
                강제 승하차지 추가
              </Button>
              {/* 비활성 버튼의 사유가 title 툴팁뿐이면 키보드·터치로는 읽을 수 없다(B1 #25) — 글자로도 보인다. */}
              {canTransfer ? null : <StyledCrewLabel>확정된 회차에는 추가할 수 없습니다 (출발 30분 전까지만)</StyledCrewLabel>}
            </>
          ) : null
        }
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <StyledMapTopRow>
        <StyledMapPane>
          <StyledMapSurface>
            <MapSurface
              camera={mapCamera}
              markers={mapMarkersWithStops}
              onMarkerClick={handleSelectMarker}
              polylines={routePolylines}
              onAuthFailed={(exception) =>
                setMapError(exception instanceof Error ? exception.message : "알 수 없는 인증 오류")
              }
            />
            {/* R20-C 목표 5 — 근사 경로 안내를 지도 안으로 올린다(Ruling 309). 예전엔
                지도 밖 아래 작은 글자라 못 보고 "길이 아닌 곳을 지난다"로 오인했다
                (사용자 지적). 선 자체도 대시로 그려진다(routeColor.ts).
                Ruling 321 — 예정 경로도 같은 자리에서 "확정된 경로"로 오인하지
                않도록 알린다. 근사·예정이 겹칠 수 있어 문구를 같이 붙인다. */}
            {routeFallback || routePlanned ? (
              <StyledMapOverlayNotice>
                {[routePlanned ? "예정 경로 — 확정 시 달라질 수 있음" : null, routeFallback ? "근사 경로" : null]
                  .filter(Boolean)
                  .join(" · ")}
              </StyledMapOverlayNotice>
            ) : null}
          </StyledMapSurface>
          {mapError ? <AlertBanner tone="missed" title="지도를 불러오지 못했습니다">{mapError}</AlertBanner> : null}
          {routeError ? <AlertBanner tone="missed" title={routeError} /> : null}
          {/* R20-C 목표 4 — "확정됐는데 경로가 없음"(데이터 결손)과 "예정 경로도
              없음"(고정 노선 자체가 없음, 정상)을 다른 문구로 가른다(Ruling 321). */}
          {routeMissing ? <StyledFallbackNotice>확정됐지만 경로 정보가 아직 없습니다</StyledFallbackNotice> : null}
          {routeNoPlannedRoute ? (
            <StyledFallbackNotice>
              이 회차의 고정 노선이 없습니다 — <Link href="/route">고정 노선 편성에서 등록하세요</Link>
            </StyledFallbackNotice>
          ) : null}
        </StyledMapPane>

        <StyledBusListPane>
          {runs.map((run) => (
            <StyledBusListItem
              key={run.runId}
              type="button"
              $active={run.runId === selectedRunId}
              aria-pressed={run.runId === selectedRunId}
              onClick={() => router.replace(`/today-run?runId=${run.runId}`)}
            >
              <StyledBusListItemHeader>
                <span>
                  {formatClockTime(run.departTime)} {run.busNo} · {DIRECTION_LABEL[run.direction]}
                </span>
                <StatusPill status={RUN_STATUS_TO_PILL[run.runStatus]}>{RUN_STATUS_LABEL[run.runStatus]}</StatusPill>
              </StyledBusListItemHeader>
            </StyledBusListItem>
          ))}
        </StyledBusListPane>
      </StyledMapTopRow>

      <StyledContentGrid>
        {/* 사용자 지시(2026-09-22) — 승하차지별로 묶어 접고 펼 수 있게, 길면 스크롤로.
            한 회차에 승하차지가 10곳이면 학생 행이 그만큼 이어져 어느 자리 학생인지
            눈으로 좇기 어렵다. 스크롤 상자는 표 머리줄을 고정한다(styled 의 sticky). */}
        <StyledSidePanel>
          <Card>
            <p>현재 위치</p>
            <StyledCrewRow>
              <StyledCrewLabel>현재 위치</StyledCrewLabel>
              <span>
                {liveRun?.position
                  ? `현재 ${liveRun.currentStop ?? "-"} → 다음 ${liveRun.nextStop ?? "-"}`
                  : liveRun?.lastSeenAt
                    ? `최근 확인 ${formatDateTime(liveRun.lastSeenAt)}`
                    : "위치 확인 대기"}
              </span>
            </StyledCrewRow>
            <StyledCrewRow>
              <StyledCrewLabel>기사</StyledCrewLabel>
              <span>
                {selectedRun?.driverName ?? "미배치"}{" "}
                {selectedRun ? (
                  <RouteAckMark name={selectedRun.driverName} acked={selectedRun.ackDriver} runStatus={selectedRun.runStatus} />
                ) : null}
              </span>
            </StyledCrewRow>
            <StyledCrewRow>
              <StyledCrewLabel>동승 매니저</StyledCrewLabel>
              <span>
                {selectedRun?.escortName ?? "미배치"}{" "}
                {selectedRun ? (
                  <RouteAckMark name={selectedRun.escortName} acked={selectedRun.ackEscort} runStatus={selectedRun.runStatus} />
                ) : null}
              </span>
            </StyledCrewRow>
            <StyledCrewRow>
              <StyledCrewLabel>출발 시각</StyledCrewLabel>
              {/* R21-B — 이전엔 raw ISO 문자열을 그대로 보여줬다(포맷 누락, 보고서 §2). 표
                  컬럼과 같은 형식으로 맞춘다. */}
              <span>{selectedRun ? formatClockTimeWithSeconds(selectedRun.departTime) : "-"}</span>
            </StyledCrewRow>
            {/* 사용자 지시(2026-09-22) — 출발 시각 아래에 도착 예정도 함께. 값은 표의 "도착"
                컬럼과 같은 `estArrivalTime` 이라 두 자리가 어긋날 수 없다. */}
            <StyledCrewRow>
              <StyledCrewLabel>도착 예정</StyledCrewLabel>
              <span>
                {selectedRun?.estArrivalTime ? formatClockTimeWithSeconds(selectedRun.estArrivalTime) : "-"}
              </span>
            </StyledCrewRow>
          </Card>

          {/* R24 — 지도에서 승하차지를 누르면 그 자리에서 타고 내리는 학생만 여기에 나온다
              (사용자 지시 — "현재 위치" 하단). 아무 곳도 안 골랐으면 카드 자체를 안 그린다:
              빈 카드가 늘 자리를 차지하면 옆 패널이 그만큼 짧아진다. */}
          {selectedStopName != null ? (
            <Card>
              <StyledStopRosterHeader>
                <p>{selectedStopName}</p>
                <Button variant="ghost" size="sm" onClick={() => setSelectedStopId(null)}>
                  전체 보기
                </Button>
              </StyledStopRosterHeader>
              {stopRoster.length === 0 ? (
                <StyledStopRosterEmpty>이 승하차지에서 타고 내리는 학생이 없습니다</StyledStopRosterEmpty>
              ) : (
                stopRoster.map((item) => (
                  <StyledStopRosterRow key={item.studentId}>
                    <StyledStopRosterName>
                      <span>{item.name}</span>
                      <StyledStopRosterClass>{item.className ?? "-"}</StyledStopRosterClass>
                    </StyledStopRosterName>
                    <StatusPill status={STATUS_PILL[item.status]}>{STATUS_LABEL[item.status]}</StatusPill>
                  </StyledStopRosterRow>
                ))
              )}
            </Card>
          ) : null}
        </StyledSidePanel>

        <Card padding={0} aria-busy={isLoading}>
          <StyledRosterScroll>
            <RosterTable
              columns={columns}
              loading={isLoading}
              rows={roster}
              getRowKey={(row) => row.studentId}
              groupBy={(row) => row.stopName ?? UNASSIGNED_STOP}
            />
          </StyledRosterScroll>
        </Card>
      </StyledContentGrid>

      {selectedRunId != null ? (
        <ForcedAddDialog
          runId={selectedRunId}
          open={forcedAddOpen}
          onClose={() => setForcedAddOpen(false)}
          onDone={() => {
            setForcedAddOpen(false);
            loadRoster(selectedRunId);
          }}
        />
      ) : null}

      {transferTarget && selectedRun ? (
        <StudentTransferDialog
          student={transferTarget}
          fromRun={selectedRun}
          candidateRuns={transferCandidates}
          onClose={() => setTransferTarget(null)}
          onDone={() => {
            setTransferTarget(null);
            loadRoster(selectedRun.runId);
            loadRuns();
          }}
        />
      ) : null}

      {cancelTarget && selectedRun ? (
        <TransferCancelDialog
          student={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={() => {
            setCancelTarget(null);
            loadRoster(selectedRun.runId);
            loadRuns();
          }}
        />
      ) : null}

      {selectedRunId != null ? (
        <ManagerAssignmentDialog
          runId={selectedRunId}
          open={assignmentOpen}
          onClose={() => setAssignmentOpen(false)}
          onDone={() => {
            setAssignmentOpen(false);
            loadRuns();
          }}
        />
      ) : null}
    </StyledTodayRunLayout>
  );
};
