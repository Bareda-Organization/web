"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { ApiError } from "@/shared/lib/http";
import {
  adminLiveDestination,
  parseWsEmergencyRaisedPayload,
  parseWsEmergencyCanceledPayload,
  parseWsPositionPayload,
  type WebSocketEnvelope,
} from "@/shared/lib/ws";
import { usePolling, useRealtimeChannel } from "@/shared/hooks";
import { AlertBanner, Button, Card, EmptyState, PageHeader, RosterTable, Select, StatusPill } from "@/shared/ui";
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
import { getAcademyRunsLive, getAllAcademies, getEmergencies } from "../api";
import type { AcademySummaryResponseTypes, RunLiveItemResponseTypes, RunStatus } from "../types";
import { emergencyTypeLabel } from "../lib/emergencyType";
import { countOpenEmergenciesByAcademy } from "../lib/openEmergencyCounts";
import { RunRosterDialog } from "./RunRosterDialog";
import {
  StyledFilterRow,
  StyledMapTopRow,
  StyledMapPane,
  StyledFallbackNotice,
  StyledMapOverlayNotice,
  StyledBusListPane,
  StyledBusListEmpty,
  StyledBusListItem,
  StyledBusListItemHeader,
  StyledMapSurface,
  StyledMonitoringLayout,
} from "./MonitoringPage.styled";

// §5.18 과 같은 근거로 5~10초 폴링 중간값 7초를 그대로 따른다(run/components/DashboardPage.tsx 참고).
const LIVE_POLL_INTERVAL_MS = 7000;
// 학원별 미확인 비상 요약은 한 번의 목록 조회라 회차 갱신보다 느린 주기면 충분하다(실시간 비상은 아래 방송 배너가 따로 띄운다).
const EMERGENCY_SUMMARY_INTERVAL_MS = 30000;

// 위치 수신 전(모든 회차가 `position: null`)에도 지도가 빈 화면이 아니라 서울 시청
// 좌표를 보여주도록 한다 — 네이버 지도 SDK 의 `MapOptions.center` 기본값과 같은 지점이다.
const DEFAULT_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  idle: "대기",
  confirmed: "확정",
  moving: "이동 중",
  finished: "종료",
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

const DIRECTION_LABEL: Record<RunLiveItemResponseTypes["direction"], string> = {
  to_academy: "등원",
  from_academy: "하원",
};

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
          if (items.length > 0) {
            setAcademyId(items[0].id);
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
  const handleSelectBus = useCallback(
    async (runId: string) => {
      const routeRequestId = ++routeRequestRef.current;
      if (selectedRunId === runId) {
        setSelectedRunId(null);
        setRoutePolylines([]);
        setRouteFallback(false);
        setRouteMissing(false);
        setRouteNoPlannedRoute(false);
        setRoutePlanned(false);
        setRouteError(null);
        setRouteStopMarkers([]);
        return;
      }
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
    [selectedRunId, runs],
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
  useEffect(() => {
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
          // `approval_requested` 는 관리자 채널에 안 오고(`docs/API_SPEC.md §7`
          // 채널 표), 그 밖의 미지 이벤트는 이 화면이 무시한다.
          return;
      }
    },
    [academyId, scheduleRunsRefresh],
  );
  const { connectionState, reconnect } = useRealtimeChannel(adminLiveDestination(), handleEnvelope);
  // Goal 9 — "데이터 없음"과 "WebSocket 연결 끊김"을 구분한다. `runs` 는 REST
  // 폴링(7초)이 WS 와 무관하게 계속 채우므로, WS 상태 배너는 목록·EmptyState 를
  // 대체하지 않고 그 위에 별도로 얹는다(DashboardPage.tsx 와 동일 판단).
  const wsIsLost = connectionState === "gaveUp" || connectionState === "forbidden";
  const wsIsReconnecting = connectionState === "reconnecting";

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
  usePolling(() => (academyId == null ? Promise.resolve(true) : loadRuns(academyId)), LIVE_POLL_INTERVAL_MS, academyId != null);

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

  const academiesWithEmergency = academies.filter((academy) => (openEmergencyCounts[academy.id] ?? 0) > 0);

  const handleSelectAcademy = (nextAcademyId: string) => {
    // 옛 학원의 회차·지도 마커가 새 학원 화면에 남지 않게 먼저 비운다(F03-09).
    setRuns([]);
    setAcademyId(nextAcademyId);
  };

  const columns: RosterColumn<RunLiveItemResponseTypes>[] = [
    { key: "busNo", label: "버스" },
    { key: "direction", label: "방향", render: (row) => DIRECTION_LABEL[row.direction] },
    {
      key: "runStatus",
      label: "상태",
      render: (row) => (
        <StatusPill status={RUN_STATUS_TO_PILL[row.runStatus]}>{RUN_STATUS_LABEL[row.runStatus]}</StatusPill>
      ),
    },
    // 배치 전(idle·confirmed) 회차는 기사·동승자가 부재다(R16, Ruling 315) — 빈 칸 대신
    // "미배치" 를 보여 준다. 관제 화면에서 배치 누락은 관리자가 봐야 하는 정보다.
    { key: "driver", label: "기사", render: (row) => row.driver?.name ?? "미배치" },
    { key: "escort", label: "동승 매니저", render: (row) => row.escort?.name ?? "미배치" },
    {
      key: "lastSeenAt",
      label: "위치",
      render: (row) =>
        row.position ? `수신 ${formatDateTime(row.position.receivedAt)}` : row.lastSeenAt ? formatDateTime(row.lastSeenAt) : "위치 확인 대기",
    },
    {
      key: "action",
      label: "",
      render: (row) => (
        <Button variant="secondary" onClick={() => setRosterTarget(row)}>
          명단 보기
        </Button>
      ),
    },
  ];

  return (
    <StyledMonitoringLayout>
      <PageHeader title="전체 관제" description="학원별 실시간 회차 현황을 확인합니다" />

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

      {wsIsLost ? (
        <AlertBanner
          tone="missed"
          title={connectionState === "forbidden" ? "실시간 조회 권한 없음" : "실시간 연결 끊김"}
          action={
            connectionState === "gaveUp" ? (
              <Button variant="secondary" size="sm" onClick={reconnect}>
                다시 연결
              </Button>
            ) : undefined
          }
        >
          {connectionState === "forbidden"
            ? "전체 관제 채널을 볼 권한이 없습니다. 목록은 자동 새로고침으로 계속 갱신됩니다."
            : "실시간 갱신 연결이 끊어졌습니다. 목록은 자동 새로고침으로 계속 갱신됩니다."}
        </AlertBanner>
      ) : null}
      {wsIsReconnecting ? <AlertBanner tone="missed" title="재연결 시도 중입니다" /> : null}

      {academiesWithEmergency.length > 0 ? (
        <AlertBanner
          tone="missed"
          title="미확인 비상이 있는 학원"
          action={academiesWithEmergency.map((academy) => (
            <Button key={academy.id} size="sm" variant="danger" onClick={() => handleSelectAcademy(academy.id)}>
              {`${academy.name} 비상 ${openEmergencyCounts[academy.id]}건`}
            </Button>
          ))}
        />
      ) : null}

      <StyledFilterRow>
        <Select
          label="학원"
          value={academyId ?? ""}
          onChange={(event) => handleSelectAcademy(event.target.value)}
          options={academies.map((academy) => ({
            value: String(academy.id),
            label: `${academy.name} (${academy.region})${openEmergencyCounts[academy.id] ? ` · 비상 ${openEmergencyCounts[academy.id]}건` : ""}`,
          }))}
          disabled={loadingAcademies || academies.length === 0}
        />
      </StyledFilterRow>

      {/* R15-T2 docs/archive/rounds/be-rounds-r15-r21.md §8.23 목표 2 — 지도가 화면 상단에 가득차고, 그 우측에 버스 목록을 둔다.
          이 화면의 목록은 §6.8 정의상 그 학원의 오늘 회차 전부(idle·confirmed·moving·finished 4종)다
          (Ruling 315 — 2026-09-19 개정. 임시 취소된 회차는 뺀다, Ruling 375). 처음 정한 "moving 만"(Ruling 313)은
          이 개정으로 대체됐다. 아래 상세 표(EmptyState/RosterTable)는 그대로 둔다. */}
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
          {routeError ? <AlertBanner tone="missed" title={routeError} /> : null}
          {/* R20-C 목표 4 — "확정됐는데 경로가 없음"(데이터 결손)과 "예정 경로도
              없음"(고정 노선 자체가 없음, 정상)을 다른 문구로 가른다(Ruling 321). */}
          {routeMissing ? <StyledFallbackNotice>확정됐지만 경로 정보가 아직 없습니다</StyledFallbackNotice> : null}
          {routeNoPlannedRoute ? (
            <StyledFallbackNotice>이 회차의 고정 노선이 없습니다 — 고정 노선 편성에서 등록하세요</StyledFallbackNotice>
          ) : null}
        </StyledMapPane>

        <StyledBusListPane>
          {runs.length === 0 ? (
            <StyledBusListEmpty>표시할 버스가 없습니다</StyledBusListEmpty>
          ) : (
            runs.map((run) => (
              <StyledBusListItem
                key={run.runId}
                type="button"
                $active={run.runId === selectedRunId}
                aria-pressed={run.runId === selectedRunId}
                onClick={() => handleSelectBus(run.runId)}
              >
                <StyledBusListItemHeader>
                  <span>
                    {run.busNo} · {DIRECTION_LABEL[run.direction]}
                  </span>
                  <StatusPill status={RUN_STATUS_TO_PILL[run.runStatus]}>{RUN_STATUS_LABEL[run.runStatus]}</StatusPill>
                </StyledBusListItemHeader>
              </StyledBusListItem>
            ))
          )}
        </StyledBusListPane>
      </StyledMapTopRow>

      <Card padding={0} aria-busy={loadingRuns}>
        {!loadingAcademies && !error && academies.length === 0 ? (
          <EmptyState icon="building" title="등록된 학원이 없습니다" />
        ) : !error && runs.length === 0 && !loadingRuns ? (
          <EmptyState icon="bus" title="지금 운행 중인 회차가 없습니다" />
        ) : (
          <RosterTable columns={columns} loading={loadingRuns} rows={runs} getRowKey={(row) => row.runId} />
        )}
      </Card>

      {rosterTarget ? (
        <RunRosterDialog runId={rosterTarget.runId} busNo={rosterTarget.busNo} onClose={() => setRosterTarget(null)} />
      ) : null}
    </StyledMonitoringLayout>
  );
};
