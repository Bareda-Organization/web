"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { ApiError } from "@/shared/lib/http";
import {
  adminLiveDestination,
  parseWsEmergencyRaisedPayload,
  parseWsEmergencyCanceledPayload,
  parseWsPositionPayload,
  type WebSocketEnvelope,
} from "@/shared/lib/ws";
import { usePolling, useRealtimeChannel } from "@/shared/hooks";
import { AlertBanner, Button, Card, EmptyState, PageHeader, RosterTable, StatusChip } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import {
  MapSurface,
  anchorForSelection,
  buildRouteDisplayState,
  visibleMarkers,
  cameraForSelectedBus,
  type MapCamera,
  type MapMarker,
  type MapPolyline,
} from "@/features/map";
import { getRunRoute } from "@/features/route";
import { getAcademyRunsLive, getAllAcademies, getEmergencies, getRunAttention } from "../api";
import type { AcademySummaryResponseTypes, RunAttentionItemTypes, RunAttentionTodayItemTypes, RunLiveItemResponseTypes } from "../types";
import { emergencyTypeLabel } from "../lib/emergencyType";
import { countOpenEmergenciesByAcademy } from "../lib/openEmergencyCounts";
import { RunRosterDialog } from "./RunRosterDialog";
import { clockOfMs, needsAttention, summarizeToday, timetableAxis } from "../lib/monitoringView";
import { AcademyRail, RunDetailPanel, StatusCell, TimetableCell, TodayStrip, directionText } from "./MonitoringParts";

import {
  StyledMonitoringGrid,
  StyledMapPane,
  StyledFallbackNotice,
  StyledMapLegend,
  StyledMapOverlayNotice,
  StyledMapSurface,
  StyledMonitoringLayout,
  StyledRunButton,
  StyledTableHeading,
} from "./MonitoringPage.styled";
import { StyledMonitoringStamp, StyledMonitoringStampDot } from "./MonitoringPage.stamp";

// §5.18 과 같은 근거로 5~10초 폴링 중간값 7초를 그대로 따른다(run/components/DashboardPage.tsx 참고).
// 실시간 연결이 끊겼을 때(재연결 중·권한 거부)의 안전망 간격이다.
const LIVE_POLL_INTERVAL_MS = 7000;
// 실시간 연결이 살아 있으면 방송(`stop_arrived`·`rider_changed`·`run_started`·`run_ended`)이 갱신을 가져온다 — 이 조회는 오늘
// 취소 아닌 회차 전부를 정차 목록과 함께 돌려주는 가장 무거운 GET 이라(R46-LOAD L3) 안전망으로만 느리게 돈다.
// 연결이 끊기면 서버 무송신 20초 초과를 10초 주기로 점검해 20~30초 안에 감지하고 7초로 돌아간다(`API_SPEC §7.2`).
const LIVE_POLL_CONNECTED_INTERVAL_MS = 30000;
// 학원별 미확인 비상·지연·확정 실패 요약은 한 번의 목록 조회라 회차 갱신보다 느린 주기면 충분하다(실시간 비상은 아래 방송 배너가 따로 띄운다).
const EMERGENCY_SUMMARY_INTERVAL_MS = 30000;

// 위치 수신 전(모든 회차가 `position: null`)에도 지도가 빈 화면이 아니라 서울 시청
// 좌표를 보여주도록 한다 — 네이버 지도 SDK 의 `MapOptions.center` 기본값과 같은 지점이다.
const DEFAULT_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

// §6.8~§6.9 전체 관제 — 학원별 실시간 회차(O-05·O-06). 메인 관리자는 학원 경계를 넘는
// 유일한 역할이라(BRIEF-a1.md §2) 학원 선택 드롭다운이 이 화면의 진입점이다 — 관계자
// 대시보드처럼 학원 하나로 고정된 화면이 아니다.
// 실시간 비상 알림 한 건 — 발생(raised)과 취소(canceled) 모두 그 신고(emergencyId) 자리에 남는다.
type LiveEmergencyAlert = {
  emergencyId: string;
  runId: string;
  state: "raised" | "canceled";
  busNo: string;
  type?: string;
  academyName?: string | null;
};

// 방송 이벤트로 회차 목록을 다시 읽을 때 겹친 이벤트를 한 번으로 묶는 대기 시간.
const RUNS_REFRESH_DEBOUNCE_MS = 300;

export const MonitoringPage = () => {
  const [academies, setAcademies] = useState<AcademySummaryResponseTypes[]>([]);
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunLiveItemResponseTypes[]>([]);
  const [rosterTarget, setRosterTarget] = useState<RunLiveItemResponseTypes | null>(null);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // F03-05 — 비상 알림은 한 줄이 아니라 목록이다. 건마다 emergencyId 로 구분해 나중 이벤트가 앞 이벤트를 덮지 않는다.
  const [liveAlerts, setLiveAlerts] = useState<LiveEmergencyAlert[]>([]);
  // B1 #24 — 학원 id → 그 학원의 미확인 비상 건수. 학원 선택 하나로 한 곳씩만 보이던 화면에서 어디를 봐야 하는지 알린다.
  const [openEmergencyCounts, setOpenEmergencyCounts] = useState<Record<string, number>>({});
  // R46-FUFEAT ④ — 학원 id → 그 학원의 오늘 지연·확정 실패 집계(§6.15). 문제가 없는 학원은 키가 없다.
  const [attentionByAcademy, setAttentionByAcademy] = useState<Record<string, RunAttentionItemTypes>>({});
  // §6.15 최상위 `today[]`(Ruling 805) — 전 학원 오늘 회차 요약. 서버가 아직 안 주면 null(레일 · 지표는 고른 학원 회차로 대신 센다).
  const [attentionToday, setAttentionToday] = useState<RunAttentionTodayItemTypes[] | null>(null);
  // "지금" — 시간표의 세로선과 "출발 시각 N분 경과" 를 위해 30초마다 갱신한다.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [mapError, setMapError] = useState<string | null>(null);
  // R15-T2 — 우측 버스 목록에서 고른 회차 하나의 노선.
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [routePolylines, setRoutePolylines] = useState<MapPolyline[]>([]);
  const [routeFallback, setRouteFallback] = useState(false);
  // R18-B 목표 3 — 경로 좌표가 0개(진짜 데이터 부재)인 상태. `routeFallback` 은
  // 뭔가 그려졌을 때의 "근사치" 안내라 서로 다른 문구다 — 둘을 동시에 켜지 않는다.
  const [routeMissing, setRouteMissing] = useState(false);
  // Ruling 321 — idle 회차인데 고정 노선(예정 경로)조차 없는 상태(정상). "확정됐는데
  // 경로가 없음"(데이터 결손, `routeMissing`)과 다른 문구를 쓴다.
  const [routeNoPlannedRoute, setRouteNoPlannedRoute] = useState(false);
  // Ruling 321 — 고정 노선 기반 "예정" 경로가 그려졌다. 확정 시점에 재계산돼 달라질
  // 수 있다는 안내에 쓴다 — "확정된 경로"로 오인하면 안 된다.
  const [routePlanned, setRoutePlanned] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  // R19 목표 1 — 선택된 회차의 정차지 마커. 전 회차를 동시에 그리면 화면이
  // 덮이므로 선택 해제 때 함께 비운다(routePolylines 와 같은 생애주기).
  const [routeStopMarkers, setRouteStopMarkers] = useState<MapMarker[]>([]);

  // 실시간 회차의 좌표를 지도 마커로 옮긴다 — 위치를 아직 못 받은 회차(`position: null`)는
  // 마커를 만들지 않는다. 마커가 하나라도 있으면 그 평균 좌표를 카메라 중심으로 삼아
  // 지금 보이는 회차들이 화면 안에 들어오게 하고, 하나도 없으면 기본 좌표를 쓴다.
  // R21-A 목표 1~3 — 고른 버스만 강조(selected)하고, 번호(busNo)·등원하원
  // (direction)을 마커에 실어 버스끼리·같은 버스의 구간끼리 구별한다.
  // W2-01 — 진행 중인 비상(`raised`)을 발신한 회차. 회차는 WS 봉투의 `run_id` 로 잇는다 — payload 의
  // `bus_no` 는 학원마다 같은 "1호차" 가 있어 다른 학원의 비상이 이 학원 버스를 붉게 만든다.
  const emergencyRunIds = useMemo(
    () => new Set(liveAlerts.filter((alert) => alert.state === "raised").map((alert) => alert.runId)),
    [liveAlerts],
  );
  const mapMarkers: MapMarker[] = useMemo(
    () =>
      runs
        .filter((run) => run.position != null)
        .map((run) => ({
          id: String(run.runId),
          lat: run.position!.lat,
          lng: run.position!.lng,
          kind: "bus" as const,
          selected: run.runId === selectedRunId,
          busNo: run.busNo,
          direction: run.direction,
          emergency: emergencyRunIds.has(String(run.runId)),
        })),
    [runs, selectedRunId, emergencyRunIds],
  );
  // R19 목표 1 — 지도에 실제로 그리는 마커 = 버스 + 선택된 회차의 정차지.
  // R23 목표 4 — 버스를 고르면 그 버스와 그 노선만 남긴다(여러 대가 동시에 움직이면
  // 고른 버스의 경로가 다른 마커에 가려 읽히지 않는다). 규칙은 `features/map` 이 갖는다.
  const mapMarkersWithStops: MapMarker[] = useMemo(
    () => visibleMarkers(mapMarkers, routeStopMarkers, selectedRunId == null ? null : String(selectedRunId)),
    [mapMarkers, routeStopMarkers, selectedRunId],
  );
  // R18-B2 목표 3 — 확대 수준은 `features/map`(`cameraForSelectedBus`)이 세 화면 몫을
  // 한 곳에서 정한다(R18-B 때 이 화면 안에 있던 상수를 공유 표면으로 올렸다).
  // R21-A 목표 4 — 고른 회차에 실시간 위치가 없으면(idle·확정·종료) 버스 마커
  // 자체가 없어 정차지 쪽으로 카메라가 못 옮겨갔다 — 정차지 평균 좌표로 대신한다.
  const selectedBusMarker = useMemo(
    () =>
      anchorForSelection(
        mapMarkers.find((marker) => marker.id === String(selectedRunId)) ?? null,
        routeStopMarkers,
      ),
    [mapMarkers, selectedRunId, routeStopMarkers],
  );
  const mapCamera: MapCamera = useMemo(() => {
    if (selectedBusMarker) return cameraForSelectedBus(selectedBusMarker, DEFAULT_CAMERA);
    if (mapMarkers.length === 0) return DEFAULT_CAMERA;
    const sum = mapMarkers.reduce((acc, marker) => ({ lat: acc.lat + marker.lat, lng: acc.lng + marker.lng }), {
      lat: 0,
      lng: 0,
    });
    return { lat: sum.lat / mapMarkers.length, lng: sum.lng / mapMarkers.length, zoom: DEFAULT_CAMERA.zoom };
  }, [selectedBusMarker, mapMarkers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 학원 선택 목록은 첫 쪽(20건)이 아니라 전부 — 21번째 이후 학원의 회차도 관제·강제 확정을 할 수 있어야 한다.
        const items = await getAllAcademies();
        if (!cancelled) {
          setAcademies(items);
          // 목록은 최근 등록 순이라 첫 항목이 셔틀 없는 비활성 학원일 수 있다 — 첫 활성 학원을 고른다
          const initial = items.find((academy) => academy.status === "active") ?? items[0];
          if (initial) {
            setAcademyId(initial.id);
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof ApiError ? cause.message : "학원 목록을 불러오지 못했습니다");
        }
      } finally {
        if (!cancelled) {
          setLoadingAcademies(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // F03-09 — 요청이 겹치면 마지막에 보낸 요청의 응답만 반영한다(학원을 바꾼 뒤 옛 학원의 늦은 응답이 목록을 덮지 않게).
  const runsRequestRef = useRef(0);
  // 돌려주는 값은 폴링용 성공 여부다(`usePolling` 이 실패하면 간격을 늘린다).
  const loadRuns = useCallback(async (id: string): Promise<boolean> => {
    const requestId = ++runsRequestRef.current;
    setLoadingRuns(true);
    try {
      const data = await getAcademyRunsLive(id);
      if (requestId !== runsRequestRef.current) return true;
      setRuns(data.runs);
      setError(null);
      return true;
    } catch (cause) {
      if (requestId !== runsRequestRef.current) return false;
      // 7초 갱신 한 번의 실패가 지도의 버스를 지우지 않게 이미 받은 목록은 둔다.
      setError(cause instanceof ApiError ? cause.message : "실시간 회차를 불러오지 못했습니다");
      return false;
    } finally {
      if (requestId === runsRequestRef.current) setLoadingRuns(false);
    }
  }, []);

  // R15-T2 목표 4 — 버스를 고르면 그 노선을 지도에 그린다. 같은 버스를 다시 고르면
  // 선택을 해제한다(DashboardPage.tsx 와 같은 토글).
  // F03-09 — 버스를 연달아 고르면 마지막에 고른 버스의 노선만 지도에 그린다.
  const routeRequestRef = useRef(0);
  // 고른 버스와 그 노선(선·정차지 마커·안내)을 푼다 — 요청 번호도 올려 아직 오지 않은 노선 응답은 버린다.
  const clearBusSelection = useCallback(() => {
    routeRequestRef.current += 1;
    setSelectedRunId(null);
    setRoutePolylines([]);
    setRouteFallback(false);
    setRouteMissing(false);
    setRouteNoPlannedRoute(false);
    setRoutePlanned(false);
    setRouteError(null);
    setRouteStopMarkers([]);
  }, []);
  const handleSelectBus = useCallback(
    async (runId: string) => {
      if (selectedRunId === runId) {
        clearBusSelection();
        return;
      }
      const routeRequestId = ++routeRequestRef.current;
      setSelectedRunId(runId);
      setRouteError(null);
      // Ruling 321 — 확정 경로일 때만 회차 상태별 색(POLYLINE_KIND_BY_STATUS)을
      // 쓴다. 목록에 이미 있는 회차만 고를 수 있어 항상 찾는다.
      const runStatus = runs.find((run) => run.runId === runId)?.runStatus ?? "idle";
      try {
        const route = await getRunRoute(runId);
        if (routeRequestId !== routeRequestRef.current) return;
        // R18-B2 — 좌표 0개=데이터 부재, 근사 경로 안내는 실제로 그려졌을 때만 켜는
        // 판단을 `features/map`(`buildRouteDisplayState`)이 세 화면 몫을 한 곳에서 한다.
        const display = buildRouteDisplayState(runId, runStatus, route);
        setRoutePolylines(display.polylines);
        setRouteFallback(display.fallback);
        setRouteMissing(display.missing);
        setRouteNoPlannedRoute(display.noPlannedRoute);
        setRoutePlanned(display.planned);
        setRouteStopMarkers(display.stopMarkers);
      } catch (cause) {
        if (routeRequestId !== routeRequestRef.current) return;
        setRoutePolylines([]);
        setRouteFallback(false);
        setRouteMissing(false);
        setRouteNoPlannedRoute(false);
        setRoutePlanned(false);
        setRouteStopMarkers([]);
        setRouteError(cause instanceof ApiError ? cause.message : "노선을 불러오지 못했습니다");
      }
    },
    [selectedRunId, runs, clearBusSelection],
  );

  // R23 목표 4 — 지도 위 마커 클릭. 버스 마커만 회차 선택으로 넘긴다 — 정차지·출발지·도착지는
  // `stop-`·`origin-` 처럼 다른 kind 라 W1(식별자 문자열 흡수) 이후에도 kind 로 가른다
  // (숫자로 읽히는지로 가르면 서버가 숫자 아닌 문자열 id 를 보내는 순간 선택이 조용히 실패한다).
  const handleSelectMarker = useCallback(
    (markerId: string) => {
      if (mapMarkers.some((marker) => marker.id === markerId)) {
        handleSelectBus(markerId);
      }
    },
    [handleSelectBus, mapMarkers],
  );

  // Goal 8 — `/topic/admin/live` 구독. 이 채널은 학원 경계를 넘어 전체를
  // 방송하므로(BRIEF-a1.md §2) `runs` 는 화면이 지금 선택한 학원 하나만 들고
  // 있다 — 봉투에는 어느 학원 소속인지 알려주는 필드가 없어(§7 공통 봉투),
  // `runId` 가 지금 목록에 있는 회차와 일치할 때만 직접 갱신하고(`position`),
  // 새 회차 시작·종료처럼 `runs` 자체의 구성이 바뀔 수 있는 이벤트는 지금
  // 선택된 학원으로 `loadRuns` 를 재조회해 반영한다 — DashboardPage 와 같은
  // 판단(payload 조각으로 목록 구조를 재구성하지 않는다, 보고서 §1).
  // `emergency_raised` 는 학원 필터와 무관하게 항상 띄운다 — Goal 8 이 요구하는
  // "모든 학원의 실시간 갱신"의 일부다.
  // F03-10 — 이 채널은 전 학원을 방송한다. 지금 보는 학원 목록에 있는 회차의 이벤트만 재조회하고,
  // 잇단 이벤트는 짧게 묶어 한 번만 읽는다.
  const runsRef = useRef(runs);
  // 레이아웃 효과로 맞춘다 — 일반 효과는 커밋보다 늦게 돌아, 목록이 화면에 나온 직후 도착한 방송이 아직 비어 있는 목록을 읽고 버려졌다.
  useLayoutEffect(() => {
    runsRef.current = runs;
  });
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRunsRefresh = useCallback(
    (id: string) => {
      if (refreshTimerRef.current !== null) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void loadRuns(id);
      }, RUNS_REFRESH_DEBOUNCE_MS);
    },
    [loadRuns],
  );
  const handleEnvelope = useCallback(
    (envelope: WebSocketEnvelope) => {
      switch (envelope.event) {
        case "position": {
          const payload = parseWsPositionPayload(envelope.payload);
          setRuns((prev) =>
            prev.map((run) =>
              String(run.runId) === envelope.runId
                ? { ...run, position: { lat: payload.lat, lng: payload.lng, receivedAt: payload.receivedAt } }
                : run,
            ),
          );
          return;
        }
        case "stop_arrived":
        case "rider_changed":
        case "run_started":
        case "run_ended":
          if (academyId != null && runsRef.current.some((run) => String(run.runId) === envelope.runId)) {
            scheduleRunsRefresh(academyId);
          }
          return;
        case "emergency_raised": {
          const payload = parseWsEmergencyRaisedPayload(envelope.payload);
          setLiveAlerts((prev) => [
            ...prev.filter((alert) => alert.emergencyId !== payload.emergencyId),
            {
              emergencyId: payload.emergencyId,
              runId: envelope.runId,
              state: "raised",
              busNo: payload.busNo,
              type: payload.type,
              academyName: payload.academyName,
            },
          ]);
          return;
        }
        // W3 — 발신 후 1분 안 취소(§4.14). 같은 신고(emergencyId)의 알림만 취소 문구로 바꾼다 —
        // 다른 버스의 진행 중인 비상은 그대로 둔다.
        case "emergency_canceled": {
          const payload = parseWsEmergencyCanceledPayload(envelope.payload);
          setLiveAlerts((prev) =>
            prev.some((alert) => alert.emergencyId === payload.emergencyId)
              ? prev.map((alert) => (alert.emergencyId === payload.emergencyId ? { ...alert, state: "canceled" as const } : alert))
              : [...prev, { emergencyId: payload.emergencyId, runId: envelope.runId, state: "canceled", busNo: payload.busNo }],
          );
          return;
        }
        default:
          // `approval_requested` 는 관리자 채널에 안 오고(`docs/planning/API_SPEC.md §7`
          // 채널 표), 그 밖의 미지 이벤트는 이 화면이 무시한다.
          return;
      }
    },
    [academyId, scheduleRunsRefresh],
  );
  // 끊겼다 다시 붙었다 — 끊긴 사이의 방송은 되찾을 길이 없다. 안전망이 30초로 늦춰지기 전에 한 번 받아 둔다(R46-FIXCONN: 판정을
  // 훅이 맡는다 — 재연결 대기 뒤 `connecting` 을 거치므로 직전 렌더 상태 비교로는 못 잡았다).
  const { connectionState } = useRealtimeChannel(adminLiveDestination(), handleEnvelope, () => {
    if (academyId != null) void loadRuns(academyId);
  });
  // 연결 끊김 안내는 이 화면이 아니라 레이아웃의 연결 띠(`RealtimeConnectionStrip`)가 모든 화면에서 한 번만 띄운다(R46-FIXCONN C-12).
  // `runs` 는 REST 폴링이 WS 와 무관하게 계속 채우므로 연결이 끊겨도 목록·EmptyState 는 그대로다.

  useEffect(() => {
    if (academyId == null) {
      return;
    }
    (async () => {
      await loadRuns(academyId);
    })();
    return () => {
      // 학원을 바꾸거나 화면을 떠나면 예약해 둔 방송 재조회도 버린다.
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [academyId, loadRuns]);

  // 응답을 받은 뒤 다음 요청을 예약하고, 숨은 탭에서는 멈추며, 실패하면 간격을 늘린다(R46-WEB C).
  // 간격은 실시간 연결 상태를 따른다 — 연결되어 있으면 30초, 아니면 7초(R46-FIXRT L3).
  usePolling(
    () => (academyId == null ? Promise.resolve(true) : loadRuns(academyId)),
    connectionState === "connected" ? LIVE_POLL_CONNECTED_INTERVAL_MS : LIVE_POLL_INTERVAL_MS,
    academyId != null,
  );

  // 한 번의 `GET /admin/emergencies?status=open` 으로 전 학원의 미확인 비상을 받아 학원별로 센다(Ruling 497 — 학원마다
  // §6.8 을 부르면 학원 수에 비례해 요청이 늘어난다). 실패해도 관제 화면을 막지 않는다 — 요약이 비어 보일 뿐이다.
  const loadEmergencySummary = useCallback(async (): Promise<boolean> => {
    try {
      const data = await getEmergencies("open");
      setOpenEmergencyCounts(countOpenEmergenciesByAcademy(data.items));
      return true;
    } catch (cause) {
      console.warn("학원별 비상 요약을 불러오지 못했다", cause);
      return false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadEmergencySummary();
    })();
  }, [loadEmergencySummary]);

  usePolling(loadEmergencySummary, EMERGENCY_SUMMARY_INTERVAL_MS);

  // 학원별 오늘 지연·확정 실패는 `GET /admin/runs/attention` 한 번으로 받는다(Ruling 543 — 기존 API 로는 학원마다 §6.8 을
  // 불러야 하고 지연은 응답에 필드가 없다). 실패해도 관제 화면을 막지 않는다 — 요약이 비어 보일 뿐이다.
  const loadAttentionSummary = useCallback(async (): Promise<boolean> => {
    try {
      const data = await getRunAttention();
      setAttentionByAcademy(Object.fromEntries(data.items.map((item) => [item.academyId, item])));
      setAttentionToday(data.today ?? null);
      return true;
    } catch (cause) {
      console.warn("학원별 지연·확정 실패 요약을 불러오지 못했다", cause);
      return false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadAttentionSummary();
    })();
  }, [loadAttentionSummary]);

  usePolling(loadAttentionSummary, EMERGENCY_SUMMARY_INTERVAL_MS);

  const handleSelectAcademy = (nextAcademyId: string) => {
    // 이미 보고 있는 학원이면 그대로 둔다 — 학원 id 가 안 바뀌면 회차 재조회 효과가 안 돌아, 비우기만 하면 다음 갱신까지 화면이 빈다.
    if (nextAcademyId === academyId) return;
    // 옛 학원의 회차·지도 마커가 새 학원 화면에 남지 않게 먼저 비운다(F03-09). 고른 버스와 그 노선도 옛 학원 것이라 함께 푼다 —
    // 남으면 지도가 고른 id 의 버스만 그려 새 학원 버스가 안 보이고 옛 노선이 남는다.
    setRuns([]);
    clearBusSelection();
    setAcademyId(nextAcademyId);
  };

  // 전 학원 오늘 요약 — 서버가 `today[]` 를 주면 그대로, 아직 안 주면 고른 학원의 회차와 학원별 지연·확정 실패로 맞춘다(다른 학원 회차 수는 알 수 없어 0).
  const todayRows: RunAttentionTodayItemTypes[] = useMemo(
    () =>
      attentionToday ??
      academies.map((academy) => {
        const mine = academy.id === academyId ? runs : [];
        return {
          academyId: academy.id,
          academyName: academy.name,
          academyStatus: academy.status,
          runCount: mine.length,
          byStatus: {
            idle: mine.filter((run) => run.runStatus === "idle").length,
            confirmed: mine.filter((run) => run.runStatus === "confirmed").length,
            moving: mine.filter((run) => run.runStatus === "moving").length,
            finished: mine.filter((run) => run.runStatus === "finished").length,
          },
          delayedRuns: attentionByAcademy[academy.id]?.delayedRuns ?? 0,
          confirmFailedRuns: attentionByAcademy[academy.id]?.confirmFailedRuns ?? 0,
        };
      }),
    [attentionToday, academies, academyId, runs, attentionByAcademy],
  );
  const summary = useMemo(() => summarizeToday(todayRows, openEmergencyCounts), [todayRows, openEmergencyCounts]);
  const academy = academies.find((item) => item.id === academyId);
  const sortedRuns = useMemo(() => [...runs].sort((a, b) => new Date(a.departTime).getTime() - new Date(b.departTime).getTime()), [runs]);
  const axis = useMemo(() => timetableAxis(sortedRuns), [sortedRuns]);
  const selectedRun = runs.find((run) => run.runId === selectedRunId) ?? null;
  const connected = connectionState === "connected";
  const movingCount = runs.filter((run) => run.runStatus === "moving").length;

  const columns: RosterColumn<RunLiveItemResponseTypes>[] = [
    {
      key: "run",
      label: "회차",
      render: (row) => (
        <StyledRunButton type="button" $active={row.runId === selectedRunId} aria-pressed={row.runId === selectedRunId} onClick={() => handleSelectBus(row.runId)}>
          <b>{formatClockTime(row.departTime)}</b>
          <small>{`${row.busNo} · ${directionText(row.direction)}`}</small>
        </StyledRunButton>
      ),
    },
    { key: "runStatus", label: "상태", render: (row) => <StatusCell run={row} nowMs={nowMs} /> },
    { key: "timetable", label: "시간표", render: (row) => <TimetableCell run={row} axis={axis} nowMs={nowMs} /> },
    // 배치 전(idle·confirmed) 회차는 기사·동승자가 부재다(R16, Ruling 315) — 빈 칸 대신 "미배치" 를 보여 준다. 관제 화면에서 배치 누락은 관리자가 봐야 하는 정보다.
    {
      key: "people",
      label: "기사 · 동승",
      render: (row) => (row.driver || row.escort ? `${row.driver?.name ?? "미배치"} · ${row.escort?.name ?? "미배치"}` : "미배치"),
    },
    {
      key: "arrival",
      label: "도착 예정",
      render: (row) => (row.runStatus === "finished" && row.finishedAt ? `종료 ${formatClockTime(row.finishedAt)}` : row.destinationEta ? formatClockTime(row.destinationEta) : "–"),
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="secondary" size="sm" aria-label={`${row.busNo} ${directionText(row.direction)} 명단 보기`} onClick={() => setRosterTarget(row)}>
          명단
        </Button>
      ),
    },
  ];

  return (
    <StyledMonitoringLayout>
      <PageHeader
        title="전체 관제"
        description="학원을 고르면 그 학원의 오늘 회차를 지도 · 표 · 승하차지로 봅니다 · 위치는 실시간, 회차 목록은 30초마다 갱신"
        actions={
          <StyledMonitoringStamp>
            <StyledMonitoringStampDot $live={connected} aria-hidden="true" />
            {clockOfMs(nowMs)} 기준 · {connected ? "실시간 연결됨" : "실시간 연결 끊김"}
          </StyledMonitoringStamp>
        }
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      {liveAlerts.map((alert) => (
        <AlertBanner
          key={alert.emergencyId}
          tone={alert.state === "raised" ? "missed" : "info"}
          title={
            alert.state === "raised"
              ? `비상 상황 발생 — ${alert.academyName ? `${alert.academyName} · ` : ""}${alert.busNo} (${emergencyTypeLabel(alert.type ?? "")})`
              : `비상 알림 취소 — ${alert.busNo}`
          }
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLiveAlerts((prev) => prev.filter((item) => item.emergencyId !== alert.emergencyId))}
            >
              닫기
            </Button>
          }
        />
      ))}

      {mapError ? <AlertBanner tone="missed" title="지도를 불러오지 못했습니다">{mapError}</AlertBanner> : null}

      <TodayStrip summary={summary} />

      {/* R15-T2 docs/archive/rounds/be-rounds-r15-r21.md §8.23 목표 2 — 지도가 화면 상단에 가득차고, 그 옆에 선택 회차 칸을 둔다.
          이 화면의 목록은 §6.8 정의상 그 학원의 오늘 회차 전부(idle·confirmed·moving·finished 4종)다
          (Ruling 315 — 2026-09-19 개정. 임시 취소된 회차는 뺀다, Ruling 375). R48 시안: 왼쪽 학원 레일 · 가운데 지도 · 오른쪽 선택 회차. */}
      <StyledMonitoringGrid>
        <AcademyRail academies={academies} today={todayRows} openEmergencyCounts={openEmergencyCounts} selectedId={academyId} onSelect={handleSelectAcademy} />

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
            <StyledMapLegend>
              {movingCount > 0 ? <StatusChip tone="move">{`운행 중 ${movingCount}대`}</StatusChip> : null}
              <span>점선 = 예정 노선 · 확정 시 달라질 수 있음</span>
            </StyledMapLegend>
            {/* R20-C 목표 5 — 근사 경로 안내를 지도 안으로 올린다(Ruling 309). 예전엔 지도 밖 아래 작은 글자라 못 보고 "길이 아닌 곳을 지난다"로 오인했다
                (사용자 지적). 선 자체도 대시로 그려진다(routeColor.ts). Ruling 321 — 예정 경로도 같은 자리에서 "확정된 경로"로 오인하지 않도록 알린다. */}
            {routeFallback || routePlanned ? (
              <StyledMapOverlayNotice>
                {[routePlanned ? "예정 경로 — 확정 시 달라질 수 있음" : null, routeFallback ? "근사 경로" : null]
                  .filter(Boolean)
                  .join(" · ")}
              </StyledMapOverlayNotice>
            ) : null}
          </StyledMapSurface>
          {routeError ? <AlertBanner tone="missed" title={routeError} /> : null}
          {/* R20-C 목표 4 — "확정됐는데 경로가 없음"(데이터 결손)과 "예정 경로도 없음"(고정 노선 자체가 없음, 정상)을 다른 문구로 가른다(Ruling 321). */}
          {routeMissing ? <StyledFallbackNotice>확정됐지만 경로 정보가 아직 없습니다</StyledFallbackNotice> : null}
          {routeNoPlannedRoute ? (
            <StyledFallbackNotice>이 회차의 고정 노선이 없습니다 — 고정 노선 편성에서 등록하세요</StyledFallbackNotice>
          ) : null}
        </StyledMapPane>

        <RunDetailPanel run={selectedRun} academyName={academy?.name} nowMs={nowMs} onRoster={setRosterTarget} />
      </StyledMonitoringGrid>

      <Card padding={0} aria-busy={loadingRuns}>
        {!loadingAcademies && !error && academies.length === 0 ? (
          <EmptyState icon="building" title="등록된 학원이 없습니다" />
        ) : !error && runs.length === 0 && !loadingRuns ? (
          <EmptyState icon="bus" title="지금 운행 중인 회차가 없습니다" />
        ) : (
          <>
            <StyledTableHeading>
              {academy ? `${academy.name} ` : ""}회차 {runs.length}
              <small>
                출발 순 · 막대 {clockOfMs(axis.startMs)}~{clockOfMs(axis.endMs)} · 세로선 = 지금
              </small>
            </StyledTableHeading>
            <RosterTable
              columns={columns}
              loading={loadingRuns}
              rows={sortedRuns}
              getRowKey={(row) => row.runId}
              selectedKey={selectedRunId}
              rowTone={(row) => (needsAttention(row, nowMs) ? "warn" : undefined)}
            />
          </>
        )}
      </Card>

      {rosterTarget ? (
        <RunRosterDialog runId={rosterTarget.runId} busNo={rosterTarget.busNo} direction={directionText(rosterTarget.direction)} onClose={() => setRosterTarget(null)} />
      ) : null}
    </StyledMonitoringLayout>
  );
};
