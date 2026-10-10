"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { usePolling, useRealtimeChannel } from "@/shared/hooks";
import { academyLiveDestination, parseWsPositionPayload, type WebSocketEnvelope } from "@/shared/lib/ws";
import { useAuthSession } from "@/features/auth";
import { AlertBanner, Button, Card, EmptyState, PageHeader, StatusPill } from "@/shared/ui";
import { formatHeaderDate } from "@/shared/lib/format/dateTime";
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
import { getDashboard, getRunRoster, getRunsLive } from "../api";
import type { DashboardRunResponseTypes, RosterItemResponseTypes, RunLiveItemResponseTypes, RunStatus } from "../types";
import { lastSeenLine } from "../lib/runBoard";
import { rosterForStop, type RosterStatusFilter } from "../lib/rosterBoard";
import { useNow } from "../lib/useNow";
import { ForcedAddDialog } from "./ForcedAddDialog";
import { ManagerAssignmentDialog } from "./ManagerAssignmentDialog";
import { RunInfoCard } from "./RunInfoCard";
import { RunRosterCard } from "./RunRosterCard";
import { RunStrip } from "./RunStrip";
import { StudentTransferDialog } from "./StudentTransferDialog";
import { TodayRunAlerts } from "./TodayRunAlerts";
import { TransferCancelDialog } from "./TransferCancelDialog";
import {
  StyledCrewLabel,
  StyledFallbackNotice,
  StyledMapCard,
  StyledMapChips,
  StyledMapInfoRow,
  StyledMapSurface,
  StyledStopRosterClass,
  StyledStopRosterEmpty,
  StyledStopRosterHeader,
  StyledStopRosterName,
  StyledStopRosterRow,
  StyledTodayRunLayout,
} from "./TodayRunPage.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";

// DashboardPage.tsx·MonitoringPage.tsx 와 같은 기본 좌표(서울 시청). `DashboardRunResponseTypes`·
// `RosterItemResponseTypes` 는 좌표 필드가 없지만(승하차지는 `stopName` 문자열만 응답에 실린다 —
// `run/types/index.ts`), `§5.18 GET /staff/runs/live`(`getRunsLive`)는 선택된 회차가 이동 중이면
// `position{lat,lng}` 을 준다 — 버스 마커는 그 응답에서 채운다(판단 근거, 보고서 §1). 위치
// 미수신 상태(`position=null`)에서는 지도가 이 기본 좌표를 그대로 보여준다.
const DEFAULT_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

// 실시간 연결이 끊겼을 때(재연결 중)의 안전망 간격 — DashboardPage.tsx 와 같은 7초(F01-03).
const LIVE_POLL_INTERVAL_MS = 7000;
// 실시간 연결이 살아 있으면 방송(`position` · `stop_arrived` · `rider_changed` · `run_started` · `run_ended`)이 갱신을 가져온다(Ruling 873).
// 방송이 없는 값(지연 분 · 확정 전환 · 노선 확인)과 놓친 방송은 이 느린 조회가 메운다 — MonitoringPage.tsx 와 같은 30초.
const LIVE_POLL_CONNECTED_INTERVAL_MS = 30000;
// 방송 뒤 재조회를 묶는 간격 — DashboardPage.tsx · MonitoringPage.tsx 와 같다.
const EVENT_REFRESH_DEBOUNCE_MS = 300;

// 명단 상태 칩(탑승 완료 · 미승차 · 미등원 …)은 `BoardingStatusChip` 이 고정 매핑으로 그린다 — 미등원은 회색(Ruling 811).
const STATUS_LABEL: Record<string, string> = { waiting: "대기", boarded: "탑승 완료", alighted: "하차 완료", absent: "미등원", no_show: "미승차" };
const STATUS_PILL: Record<string, "boarded" | "moving" | "missed" | "idle"> = {
  waiting: "idle",
  boarded: "boarded",
  alighted: "boarded",
  absent: "idle",
  no_show: "missed",
};
// §5.4 GET /staff/runs/{runId}/roster(A-06) · §5.7 POST .../forced-add(A-07) ·
// §5.8 POST /staff/students/{id}/transfer(A-07, R34-W1) · §5.14 PATCH .../assignment(A-06) —
// 금일 운행 상세(UF-M-03·UF-M-04).
export const TodayRunPage = () => {
  const router = useRouter();
  const { session } = useAuthSession();
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
  // 명단 상태 칩의 선택 — 미승차 띠의 [명단 보기] 가 `no_show` 로 바꾼다.
  const [statusFilter, setStatusFilter] = useState<RosterStatusFilter>("all");
  // §5.4 · §5.19 의 403 ACADEMY_SCOPE_VIOLATION — 다른 학원 회차는 열 수 없다(타 학원 링크를 받았거나 주소를 직접 입력).
  const [forbidden, setForbidden] = useState(false);
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
  // R24 — 지도에서 고른 승하차지의 이름 · 학생. 명단(§5.4)은 `stop_id` 를 싣기 시작해(Ruling 811) 노선(§5.19)과 id 로 잇는다 —
  // 같은 이름의 승하차지가 둘이어도 고른 자리의 학생만 나온다. `stop_id` 가 없는 행(옛 서버 · 확정 전 예정 명단)만 이름으로 맞춘다.
  const selectedStopName = useMemo(
    () => routeStops.find((stop) => stop.stopId === selectedStopId)?.name ?? null,
    [routeStops, selectedStopId],
  );
  const stopRoster = useMemo(() => rosterForStop(roster, routeStops, selectedStopId), [roster, routeStops, selectedStopId]);
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
      if (cause instanceof ApiError && cause.code === "ACADEMY_SCOPE_VIOLATION") {
        setForbidden(true);
        setRoster([]);
        return false;
      }
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

  // Ruling 873 · API_SPEC §7 — 운행 상세도 오늘 현황과 같은 학원 채널(`/topic/academy/{id}/live`)을 구독한다.
  // 위치(`position`)는 payload 로 마커만 바꾸고(REST 를 부르지 않는다), 나머지 방송은 짧게 묶어 한 번 다시 읽는다 —
  // 이 회차의 방송이면 회차 목록 · 명단 · 위치를, 다른 회차의 방송이면 회차 목록만(우측 버스 목록의 상태가 바뀔 수 있다).
  // 명단 조회는 서버가 호출마다 감사 기록을 남기므로 이 회차와 무관한 방송으로는 읽지 않는다.
  const selectedRunIdRef = useRef(selectedRunId);
  // 레이아웃 효과로 맞춘다 — 타이머가 지금 보는 회차를 읽어야 하고, 일반 효과는 커밋보다 늦게 돈다(MonitoringPage.tsx 와 같다).
  useLayoutEffect(() => {
    selectedRunIdRef.current = selectedRunId;
  });
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSelectedRef = useRef(false);
  const refreshAll = useCallback(
    (includeSelected: boolean) => {
      void loadRuns(true);
      const runId = selectedRunIdRef.current;
      if (includeSelected && runId != null) {
        void loadRoster(runId, true);
        void loadLiveRun(runId, true);
      }
    },
    [loadRuns, loadRoster, loadLiveRun],
  );
  const scheduleRefresh = useCallback(
    (forSelectedRun: boolean) => {
      if (forSelectedRun) refreshSelectedRef.current = true;
      if (refreshTimerRef.current !== null) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        const includeSelected = refreshSelectedRef.current;
        refreshSelectedRef.current = false;
        refreshAll(includeSelected);
      }, EVENT_REFRESH_DEBOUNCE_MS);
    },
    [refreshAll],
  );
  useEffect(
    () => () => {
      // 화면을 떠나면 예약해 둔 방송 재조회도 버린다.
      if (refreshTimerRef.current !== null) clearTimeout(refreshTimerRef.current);
    },
    [],
  );
  const handleEnvelope = useCallback(
    (envelope: WebSocketEnvelope) => {
      const isSelectedRun = envelope.runId === selectedRunIdRef.current;
      switch (envelope.event) {
        case "position": {
          if (!isSelectedRun) return;
          const payload = parseWsPositionPayload(envelope.payload);
          setLiveRun((prev) =>
            prev
              ? { ...prev, position: { lat: payload.lat, lng: payload.lng, recordedAt: payload.receivedAt }, currentStop: payload.currentStopName ?? prev.currentStop }
              : prev,
          );
          return;
        }
        // 다른 회차의 도착은 이 화면의 어떤 값도 바꾸지 않는다.
        case "stop_arrived":
          if (isSelectedRun) scheduleRefresh(true);
          return;
        case "rider_changed":
        case "run_started":
        case "run_ended":
          scheduleRefresh(isSelectedRun);
          return;
        default:
          // 비상 알림은 `(staff)` 레이아웃의 EmergencyAlertProvider 가 전 화면에서 받는다 · 탑승 승인 요청은 승인 대기 제공자가 받는다.
          return;
      }
    },
    [scheduleRefresh],
  );
  // 끊겼다 다시 붙으면 끊긴 사이의 방송을 되찾을 길이 없다 — 한 번 REST 로 메운다(`API_SPEC §7.2`, DashboardPage 와 같은 훅 계약).
  const { connectionState } = useRealtimeChannel(academyLiveDestination(session?.academy?.id ?? ""), handleEnvelope, () => refreshAll(true));

  // F01-03 — 종료되지 않은 회차는 화면을 열어 둔 동안 회차 상태·명단·위치를 다시 불러온다(안전망). 표를 '불러오는 중' 으로
  // 뒤집지 않도록 전부 silent 다.
  // 응답을 받은 뒤 다음 요청을 예약한다 — 명단 조회는 서버가 호출마다 감사 기록을 남기므로 요청이 겹치면 기록도 겹친다.
  // 숨은 탭에서는 멈추고 실패하면 간격을 늘린다. 간격은 실시간 연결 상태를 따른다 — 연결돼 있으면 30초, 아니면 7초(R46-FIXRT L3 · R52 Ruling 873).
  usePolling(
    async () => {
      if (selectedRunId == null) return true;
      const results = await Promise.all([loadRuns(true), loadRoster(selectedRunId, true), loadLiveRun(selectedRunId, true)]);
      return results.every(Boolean);
    },
    connectionState === "connected" ? LIVE_POLL_CONNECTED_INTERVAL_MS : LIVE_POLL_INTERVAL_MS,
    selectedRunId != null && selectedRunStatus != null && selectedRunStatus !== "finished",
  );

  // 카운트다운(미승차 대기 시간)이 있으면 1초마다, 없으면 30초마다 "지금" 을 다시 읽는다.
  const nowMs = useNow(selectedRun && selectedRun.noShowCases.length > 0 ? 1000 : 30_000);
  const addedCount = roster.filter((item) => item.change === "added").length;
  const transferCount = roster.filter((item) => item.transferId != null).length;

  const description = `${formatHeaderDate()} · ${
    canTransfer ? "확정 전 회차는 학생을 다른 버스로 옮기거나 강제로 추가할 수 있습니다" : "회차를 고르면 위치 · 인원 · 명단을 한 화면에서 봅니다"
  }`;

  if (forbidden) {
    return (
      <StyledTodayRunLayout>
        <PageHeader title="운행 상세" description="이 회차는 열 수 없습니다" />
        <Card>
          <EmptyState
            icon="lock"
            tone="warn"
            title="이 학원의 회차가 아니라서 열 수 없습니다"
            action={
              <>
                <Button onClick={() => router.push("/today-run")}>오늘 운행 목록으로</Button>
                <Button variant="secondary" onClick={() => router.push("/dashboard")}>
                  오늘 현황
                </Button>
              </>
            }
          >
            주소를 직접 입력했거나 다른 학원에서 받은 링크일 수 있습니다. 이 학원의 회차만 볼 수 있습니다.
            <br />
            <small>접근이 거부됐습니다 · 403 ACADEMY_SCOPE_VIOLATION</small>
          </EmptyState>
        </Card>
      </StyledTodayRunLayout>
    );
  }

  return (
    <StyledTodayRunLayout>
      <PageHeader
        title="운행 상세"
        description={description}
        actions={
          selectedRun ? (
            <>
              <Button variant="secondary" icon="user-cog" onClick={() => setAssignmentOpen(true)}>
                매니저 배치 변경
              </Button>
              {/* §5.7 — 강제 추가는 ①구간(확정 전) 전용이다. 확정된 회차는 끝까지 입력한 뒤에야 403 을 받게 되므로 미리 막는다. */}
              <Button
                variant={canTransfer ? "primary" : "secondary"}
                icon="plus"
                disabled={!canTransfer}
                title={canTransfer ? undefined : "확정된 회차에는 추가할 수 없습니다 (출발 30분 전까지만)"}
                onClick={() => setForcedAddOpen(true)}
              >
                강제 승하차지 추가
              </Button>
            </>
          ) : null
        }
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <RunStrip runs={runs} selectedRunId={selectedRunId} nowMs={nowMs} onSelect={(runId) => router.replace(`/today-run?runId=${runId}`)} />

      {selectedRun ? (
        <TodayRunAlerts
          run={selectedRun}
          roster={roster}
          nowMs={nowMs}
          onShowNoShow={() => setStatusFilter("no_show")}
          onOpenAssignment={() => setAssignmentOpen(true)}
        />
      ) : null}

      <StyledMapInfoRow>
        <StyledMapCard aria-label={selectedRun?.runStatus === "idle" ? "예정 경로" : "실시간 위치"}>
          <header>
            <h2>{selectedRun?.runStatus === "idle" ? "예정 경로" : "실시간 위치"}</h2>
            <p>
              {selectedRun?.runStatus === "idle"
                ? "확정 전이라 버스 위치가 없습니다"
                : liveRun?.position
                  ? `마지막 수신 ${formatDateTime(liveRun.position.recordedAt)}`
                  : ""}
            </p>
          </header>
          <StyledMapSurface>
            <MapSurface
              camera={mapCamera}
              markers={mapMarkersWithStops}
              onMarkerClick={handleSelectMarker}
              polylines={routePolylines}
              onAuthFailed={(exception) => setMapError(exception instanceof Error ? exception.message : "알 수 없는 인증 오류")}
            />
            {/* 현재 → 다음 정차지(§5.18) · 근사·예정 경로 안내를 지도 안 이름표로 올린다(Ruling 309 · 321) — 지도 밖 작은 글자는 "길이 아닌 곳을 지난다" 로 오인됐다. */}
            <StyledMapChips>
              {selectedRun?.runStatus !== "idle" ? (
                <p>
                  {liveRun?.position ? `현재 ${liveRun.currentStop ?? "-"} → 다음 ${liveRun.nextStop ?? "-"}` : lastSeenLine(liveRun?.lastSeenAt, nowMs)}
                </p>
              ) : null}
              {routeFallback || routePlanned ? (
                <p data-kind="notice">
                  {[routePlanned ? "예정 경로 — 확정 시 달라질 수 있음" : null, routeFallback ? "근사 경로" : null].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </StyledMapChips>
          </StyledMapSurface>
          {mapError ? <AlertBanner tone="missed" title="지도를 불러오지 못했습니다">{mapError}</AlertBanner> : null}
          {routeError ? <AlertBanner tone="missed" title={routeError} /> : null}
          {/* R20-C 목표 4 — "확정됐는데 경로가 없음"(데이터 결손)과 "예정 경로도 없음"(고정 노선 자체가 없음, 정상)을 다른 문구로 가른다(Ruling 321). */}
          {routeMissing ? <StyledFallbackNotice>확정됐지만 경로 정보가 아직 없습니다</StyledFallbackNotice> : null}
          {routeNoPlannedRoute ? (
            <StyledFallbackNotice>
              이 회차의 고정 노선이 없습니다 — <Link href="/route">고정 노선 편성에서 등록하세요</Link>
            </StyledFallbackNotice>
          ) : null}
        </StyledMapCard>

        <div>
          {selectedRun ? <RunInfoCard run={selectedRun} addedCount={addedCount} transferCount={transferCount} /> : null}
          {/* R24 — 지도에서 승하차지를 누르면 그 자리에서 타고 내리는 학생만 여기에 나온다(사용자 지시).
              아무 곳도 안 골랐으면 카드 자체를 안 그린다. */}
          {selectedStopName != null ? (
            <Card>
              <StyledStopRosterHeader>
                <h3>{selectedStopName}</h3>
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
        </div>
      </StyledMapInfoRow>

      <RunRosterCard
        roster={roster}
        routeStops={routeStops}
        currentStop={liveRun?.currentStop ?? null}
        nextStop={liveRun?.nextStop ?? null}
        isIdle={selectedRun?.runStatus === "idle"}
        canTransfer={canTransfer}
        loading={isLoading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onTransfer={setTransferTarget}
        onCancelTransfer={setCancelTarget}
      />
      {!canTransfer && selectedRun ? <StyledCrewLabel>확정된 회차에는 추가할 수 없습니다 (출발 30분 전까지만)</StyledCrewLabel> : null}

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
