"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth";
import { ApiError } from "@/shared/lib/http";
import {
  academyLiveDestination,
  parseWsApprovalRequestedPayload,
  parseWsPositionPayload,
  type WebSocketEnvelope,
} from "@/shared/lib/ws";
import { usePolling, useRealtimeChannel } from "@/shared/hooks";
import { AlertBanner, Button, EmptyState, PageHeader, SkeletonGroup, Skeleton, StatStrip } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import { formatDateTime, formatHeaderDate } from "@/shared/lib/format/dateTime";
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
import { formatClockTime, formatClockTimeWithSeconds } from "@/shared/lib/format/clockTime";
import { getDashboard, getRunsLive } from "../api";
import type { DashboardRunResponseTypes, RunLiveItemResponseTypes } from "../types";
import { sumRiders, splitRiders } from "../lib/runBoard";
import { DashboardActionsCard, type PendingApprovals } from "./DashboardActionsCard";
import { DashboardRunsCard } from "./DashboardRunsCard";
import { RiderSplitBar, RiderSplitLegend } from "./RiderSplitBar";
import {
  StyledBoardCard,
  StyledBoardCardBody,
  StyledBoardCardHead,
  StyledBoardRow,
  StyledDashboardLayout,
  StyledFallbackNotice,
  StyledFootnote,
  StyledLiveLines,
  StyledLiveStatus,
  StyledMapOverlayNotice,
  StyledMapPane,
  StyledMapSurface,
  StyledMapTab,
  StyledMapTabs,
  StyledRunRiderBlock,
  StyledSegmentBar,
} from "./DashboardPage.styled";

// §5.18 이 5~10초 폴링 대상이라고 명시(LOC-01) — 중간값 7초를 썼다(판단 근거, 보고서 §1).
const LIVE_POLL_INTERVAL_MS = 7000;
// 방송 이벤트 뒤 재조회를 묶는 간격 — MonitoringPage.tsx 의 `RUNS_REFRESH_DEBOUNCE_MS` 와 같다(R46-FIXRT L4).
const EVENT_REFRESH_DEBOUNCE_MS = 300;

// MonitoringPage.tsx 와 같은 기본 좌표(서울 시청) — 위치 수신 전에도 지도가 빈 화면이
// 아니게 한다.
const DEFAULT_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

const DIRECTION_LABEL: Record<DashboardRunResponseTypes["direction"], string> = {
  to_academy: "등원",
  from_academy: "하원",
};

// §5.3 GET /staff/dashboard(A-03) + §5.18 GET /staff/runs/live(A-14) — 관계자 웹
// 운행 관리 첫 화면(UF-M-05). 실시간 카드 안의 지도는 F4-B 에서 실제 네이버 지도로
// 대체됐고, 명단·진행률·지연은 그대로 표로 그린다.
// `pendingSlot` — 시작 체크리스트 같은 위쪽 안내 자리. `approvals` — 처리 대기 건수(승인 대기 제공자의 값).
// `run` 이 `approval`·`onboarding` 을 직접 읽지 않게 라우트 페이지가 채워 넣는다.
const NO_APPROVALS: PendingApprovals = { signupCount: 0, changeCount: 0, nextDeadlineAt: null, isReady: false };

const mockableConnectionLabel = (state: string): string => (state === "connected" ? "실시간 연결" : "주기 갱신 중");

export const DashboardPage = ({ pendingSlot, approvals = NO_APPROVALS }: { pendingSlot?: React.ReactNode; approvals?: PendingApprovals }) => {
  const router = useRouter();
  const { session } = useAuthSession();
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getDashboard>>["metrics"] | null>(null);
  const [runs, setRuns] = useState<DashboardRunResponseTypes[]>([]);
  const [liveRuns, setLiveRuns] = useState<RunLiveItemResponseTypes[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // "지금" — 응답을 받을 때마다 갱신한다(7초 주기). 시간표의 지금 선 · 미승차 남은 분이 이 값을 쓴다.
  const [nowMs, setNowMs] = useState(() => Date.now());
  // F01-09 — 도착한 탑승 승인 요청. 처리 경로(승인 화면)와 닫기를 함께 두고, 여러 건이면 건수로 합친다.
  const [approvalRequests, setApprovalRequests] = useState<{ approvalId: string; label: string }[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  // R15-T2 — 우측 버스 목록에서 고른 회차 하나의 노선. 목록 자체는 `runs`(getDashboard,
  // 4종 상태 전부)를 쓰고, 위치만 `liveRuns`(getRunsLive, moving 전용)에서 run_id 로
  // 합친다(docs/archive/rounds/be-rounds-r15-r21.md §8.23 목표 3 이 못박은 함정 회피).
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [routePolylines, setRoutePolylines] = useState<MapPolyline[]>([]);
  const [routeFallback, setRouteFallback] = useState(false);
  // R18-B2 목표 1 — MonitoringPage.tsx 와 같은 형태(경로 좌표 0개=데이터 부재 안내).
  const [routeMissing, setRouteMissing] = useState(false);
  // Ruling 321 — idle 회차인데 고정 노선(예정 경로)조차 없는 상태(정상, MonitoringPage.tsx 와 같은 형태).
  const [routeNoPlannedRoute, setRouteNoPlannedRoute] = useState(false);
  // Ruling 321 — 고정 노선 기반 "예정" 경로가 그려졌다. 확정 시점에 재계산돼 달라질 수 있다.
  const [routePlanned, setRoutePlanned] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  // R19 목표 1 — 선택된 회차의 정차지 마커(MonitoringPage.tsx 와 같은 생애주기).
  const [routeStopMarkers, setRouteStopMarkers] = useState<MapMarker[]>([]);

  const liveByRunId = useMemo(() => new Map(liveRuns.map((run) => [run.runId, run])), [liveRuns]);

  // R21-A 목표 1~3 — MonitoringPage.tsx 와 같은 방식(선택 강조·번호·등원하원).
  const mapMarkers: MapMarker[] = useMemo(
    () =>
      liveRuns
        .filter((run) => run.position != null)
        .map((run) => ({
          id: String(run.runId),
          lat: run.position!.lat,
          lng: run.position!.lng,
          kind: "bus" as const,
          selected: run.runId === selectedRunId,
          busNo: run.busNo,
          direction: run.direction,
        })),
    [liveRuns, selectedRunId],
  );
  // R19 목표 1 — 지도에 실제로 그리는 마커 = 버스 + 선택된 회차의 정차지.
  // R23 목표 4 — 버스를 고르면 그 버스와 그 노선만 남긴다(여러 대가 동시에 움직이면
  // 고른 버스의 경로가 다른 마커에 가려 읽히지 않는다). 규칙은 `features/map` 이 갖는다.
  const mapMarkersWithStops: MapMarker[] = useMemo(
    () => visibleMarkers(mapMarkers, routeStopMarkers, selectedRunId == null ? null : String(selectedRunId)),
    [mapMarkers, routeStopMarkers, selectedRunId],
  );
  // R18-B2 목표 1·3 — 확대 수준은 `features/map`(`cameraForSelectedBus`)이 세 화면
  // 몫을 한 곳에서 정한다(MonitoringPage.tsx 와 같은 방식).
  // R21-A 목표 4 — 실시간 위치가 없는 회차를 골라도 정차지 쪽으로 카메라가
  // 옮겨가도록 정차지 평균 좌표를 대신 쓴다(MonitoringPage.tsx 와 같은 방식).
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

  // 요청 번호 — 겹친 요청에서는 최신 요청의 응답만 반영한다(F01-01·F01-05).
  const dashboardSeq = useRef(0);
  const routeSeq = useRef(0);

  // silent — 주기·이벤트 갱신. 실패해도 이미 보이던 지표·표를 오류로 덮지 않는다(다음 주기에 회복).
  // 돌려주는 값은 폴링용 성공 여부다 — 실패하면 `usePolling` 이 간격을 늘린다.
  const loadDashboard = useCallback(async (silent = false): Promise<boolean> => {
    const mine = ++dashboardSeq.current;
    try {
      const data = await getDashboard();
      if (mine !== dashboardSeq.current) return true;
      setMetrics(data.metrics);
      setRuns(data.runs);
      setNowMs(Date.now());
      setError(null);
      return true;
    } catch (cause) {
      if (!silent && mine === dashboardSeq.current) {
        setError(cause instanceof ApiError ? cause.message : "대시보드를 불러오지 못했습니다");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLive = useCallback(async (): Promise<boolean> => {
    try {
      const data = await getRunsLive();
      setLiveRuns(data.runs);
      return true;
    } catch {
      // 실시간 카드는 보조 정보라 실패해도 본문 오류로 승격하지 않는다 — 다음 폴링에서 회복.
      return false;
    }
  }, []);

  // R15-T2 목표 4 — 버스를 고르면 그 노선을 지도에 그린다. 같은 버스를 다시 고르면
  // 선택을 해제한다(토글) — 목표 4 "선택 해제도 검사"가 요구하는 짝.
  const handleSelectBus = useCallback(
    async (runId: string) => {
      const mine = ++routeSeq.current;
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
      // Ruling 321 — 확정 경로일 때만 회차 상태별 색을 쓴다. 목록에 이미 있는
      // 회차만 고를 수 있어 항상 찾는다.
      const runStatus = runs.find((run) => run.runId === runId)?.runStatus ?? "idle";
      try {
        const route = await getRunRoute(runId);
        // F01-05 — 그 사이 다른 버스를 골랐거나 선택을 해제했으면 이 응답은 버린다.
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
      } catch (cause) {
        if (mine !== routeSeq.current) return;
        // C00-03 — 고정 노선이 없는 확정 전 회차는 409 RUN_NOT_CONFIRMED. 원문("확정되지 않은 회차입니다")은
        // "확정을 기다리면 된다" 로 읽히므로 고정 노선 부재 안내로 바꾼다.
        const noFixedRoute = cause instanceof ApiError && cause.code === "RUN_NOT_CONFIRMED";
        setRoutePolylines([]);
        setRouteFallback(false);
        setRouteMissing(false);
        setRouteNoPlannedRoute(noFixedRoute);
        setRoutePlanned(false);
        setRouteStopMarkers([]);
        if (!noFixedRoute) setRouteError(cause instanceof ApiError ? cause.message : "노선을 불러오지 못했습니다");
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

  // Goal 7 — `/topic/academy/{academyId}/live` 구독. `position` 은 payload 가
  // 화면에 필요한 필드(lat·lng·currentStopName)를 전부 담고 있어 `liveRuns` 를
  // 직접 갱신하고, 나머지 회차 상태 변화(`stop_arrived`·`rider_changed`·
  // `run_started`·`run_ended`) 는 payload 가 `progress`·`nextStop` 같은 화면
  // 필드를 안 담고 있어 `loadLive()` 재조회로 반영한다 — 7초 폴링보다 먼저
  // 최신값을 받는 효과만 노리고, payload 조각으로 상태를 억지로 재구성하지
  // 않는다(판단 근거, 보고서 §1). `AuthGateGuard` 가 관계자 role 에서만 이
  // 화면을 그리므로 `session.academy` 는 항상 값이 있다고 본다(서버 불변식).
  // 이벤트 뒤 재조회 묶음 — 첫 이벤트가 타이머를 걸고, 타이머가 도는 동안의 이벤트는 그 묶음에 들어간다(타이머를
  // 밀지 않는다 — 이벤트가 쉬지 않고 와도 화면이 `EVENT_REFRESH_DEBOUNCE_MS` 보다 오래 낡지 않는다). 지표·회차 표는
  // 묶음 안에 그 이벤트가 하나라도 있을 때만 다시 받는다.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshDashboardRef = useRef(false);
  const scheduleRefresh = useCallback(
    (withDashboard: boolean) => {
      if (withDashboard) refreshDashboardRef.current = true;
      if (refreshTimerRef.current !== null) return;
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        const needsDashboard = refreshDashboardRef.current;
        refreshDashboardRef.current = false;
        void loadLive();
        if (needsDashboard) void loadDashboard(true);
      }, EVENT_REFRESH_DEBOUNCE_MS);
    },
    [loadLive, loadDashboard],
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
      switch (envelope.event) {
        case "position": {
          const payload = parseWsPositionPayload(envelope.payload);
          setLiveRuns((prev) =>
            prev.map((run) =>
              String(run.runId) === envelope.runId
                ? {
                    ...run,
                    position: { lat: payload.lat, lng: payload.lng, recordedAt: payload.receivedAt },
                    currentStop: payload.currentStopName ?? run.currentStop,
                  }
                : run,
            ),
          );
          return;
        }
        // 잇단 이벤트는 짧게 묶어 한 번만 읽는다(R46-FIXRT L4 — MonitoringPage 와 같다).
        case "stop_arrived":
          scheduleRefresh(false);
          return;
        // 탑승 수·회차 상태는 위치 응답이 아니라 대시보드 응답에 있어 함께 다시 불러온다(F01-01).
        case "rider_changed":
        case "run_started":
        case "run_ended":
          scheduleRefresh(true);
          return;
        // 비상 알림(`emergency_raised`·`emergency_canceled`)은 `(staff)` 레이아웃의
        // EmergencyAlertProvider 가 전 화면에서 받는다(R32-W5) — 여기서 또 처리하면 이중 표시다.
        case "approval_requested": {
          const payload = parseWsApprovalRequestedPayload(envelope.payload);
          setApprovalRequests((prev) =>
            prev.some((request) => request.approvalId === payload.approvalId)
              ? prev
              : [...prev, { approvalId: payload.approvalId, label: `${payload.studentName} (${payload.stopName})` }],
          );
          return;
        }
        default:
          // 미지 이벤트(`eventWireValue` 로 원문 보존) — 이 화면은 무시한다.
          return;
      }
    },
    [scheduleRefresh],
  );
  const { connectionState } = useRealtimeChannel(academyLiveDestination(session?.academy?.id ?? ""), handleEnvelope);
  // 연결 끊김 안내는 이 화면이 아니라 레이아웃의 연결 띠(`RealtimeConnectionStrip`)가 모든 화면에서 한 번만 띄운다(R46-FIXCONN C-12).
  // `liveRuns` 는 REST 폴링(7초)이 WS 와 무관하게 계속 채우므로 WS 가 끊겨도 "오늘 등록된 회차가 없습니다" 는 여전히 사실이다.

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadDashboard();
      if (!cancelled) {
        await loadLive();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDashboard, loadLive]);

  // F01-01 — 지표·회차 표·미탑승 배너도 같은 주기로 새로 받는다. 응답을 받은 뒤 다음 요청을 예약하고,
  // 숨은 탭에서는 멈추며, 실패하면 간격을 늘린다(R46-WEB C).
  usePolling(async () => {
    const results = await Promise.all([loadLive(), loadDashboard(true)]);
    return results.every(Boolean);
  }, LIVE_POLL_INTERVAL_MS);

  const toAcademyRuns = runs.filter((run) => run.direction === "to_academy");
  const fromAcademyRuns = runs.filter((run) => run.direction === "from_academy");
  const toAcademyRiders = sumRiders(toAcademyRuns);
  const lastPositionAt = liveRuns.reduce<string | null>(
    (latest, run) => (run.position && (latest === null || run.position.recordedAt > latest) ? run.position.recordedAt : latest),
    null,
  );

  const runCount = (status: DashboardRunResponseTypes["runStatus"]) => runs.filter((run) => run.runStatus === status).length;
  const firstNoShow = runs.find((run) => run.noShowCases.length > 0);
  const firstGap = runs.find((run) => run.runStatus !== "finished" && (run.driverName === null || run.escortName === null));
  const boardedPercent = toAcademyRiders.total === 0 ? 0 : Math.round((toAcademyRiders.boarded / toAcademyRiders.total) * 100);

  const statItems: StatStripItem[] = [
    {
      label: "오늘 운행",
      value: runs.length,
      unit: "회",
      detail: (
        <>
          운행 중 {runCount("moving")}대 · 종료 {runCount("finished")}
          <br />
          확정 {runCount("confirmed")} · 운행 전 {runCount("idle")}
          <StyledSegmentBar role="img" aria-label={`종료 ${runCount("finished")} · 운행 중 ${runCount("moving")} · 확정 ${runCount("confirmed")} · 운행 전 ${runCount("idle")}`}>
            {(
              [
                ["finished", "var(--c-end)"],
                ["moving", "var(--c-move)"],
                ["confirmed", "var(--c-conf)"],
                ["idle", "var(--green-300)"],
              ] as const
            )
              .filter(([status]) => runCount(status) > 0)
              .map(([status, color]) => (
                <span key={status} style={{ flex: runCount(status), background: color }} />
              ))}
          </StyledSegmentBar>
        </>
      ),
    },
    {
      label: "탑승 완료",
      value: metrics?.boarded ?? "-",
      unit: "명",
      detail: (
        <>
          등원 대상 {toAcademyRiders.total}명 중 {boardedPercent}%
          <StyledSegmentBar role="img" aria-label={`등원 대상 ${toAcademyRiders.total}명 중 ${boardedPercent}% 탑승`}>
            <span style={{ flex: boardedPercent, background: "var(--c-conf)" }} />
            <span style={{ flex: 100 - boardedPercent, background: "var(--border-subtle)" }} />
          </StyledSegmentBar>
        </>
      ),
    },
    {
      label: "미승차",
      value: metrics?.noShow ?? "-",
      unit: "명",
      tone: "bad",
      detail: firstNoShow
        ? `${firstNoShow.busNo} ${DIRECTION_LABEL[firstNoShow.direction]} · ${firstNoShow.noShowCases[0].stopName} 통과 후 승차하지 않음`
        : "정차지를 지나고도 타지 않은 학생",
    },
    { label: "미등원", value: metrics?.absent ?? "-", unit: "명", detail: "학부모가 미리 끈 학생 · 명단에는 회색 행으로 남습니다" },
    {
      label: "배치 없는 매니저",
      value: metrics?.unassignedManagers ?? "-",
      unit: "명",
      detail: firstGap ? `${firstGap.busNo} ${DIRECTION_LABEL[firstGap.direction]}은 ${firstGap.driverName === null ? "기사도" : "동승 매니저도"} 미배치` : "오늘 회차에 배치되지 않은 매니저",
    },
  ];

  const handleRetry = () => {
    setLoading(true);
    void loadDashboard();
  };

  return (
    <StyledDashboardLayout>
      <PageHeader
        title="오늘 현황"
        description={`${formatHeaderDate()} · ${session?.academy?.name ?? ""} — 지금 급한 것부터, 오늘 운행 순서대로`}
        actions={
          <StyledLiveStatus>
            {formatClockTime(new Date(nowMs).toISOString())} 기준 · {mockableConnectionLabel(connectionState)}
          </StyledLiveStatus>
        }
      />

      {pendingSlot}

      {error && runs.length === 0 ? (
        <StyledBoardCard>
          <EmptyState
            icon="cloud-off"
            tone="bad"
            title="오늘 현황을 불러오지 못했습니다"
            action={
              <>
                <Button icon="refresh-cw" onClick={handleRetry}>
                  다시 시도
                </Button>
                <Button variant="secondary" onClick={() => router.push("/emergency")}>
                  비상 알림 보기
                </Button>
              </>
            }
          >
            <span role="alert">{error}</span> 잠시 뒤 다시 시도해 주세요. 다시 시도해도 안 되면 학원 운영 담당에게 알려 주세요. 급한 일이 있으면 비상 알림에서 바로 확인할 수 있습니다.
          </EmptyState>
        </StyledBoardCard>
      ) : (
        <>
          {approvalRequests.length > 0 ? (
            <AlertBanner
              tone="missed"
              title={
                approvalRequests.length === 1
                  ? `탑승 승인 요청 — ${approvalRequests[0].label}`
                  : `탑승 승인 요청 ${approvalRequests.length}건 — ${approvalRequests[approvalRequests.length - 1].label} 외`
              }
              action={
                <>
                  <Button size="sm" variant="secondary" onClick={() => router.push("/change-approval")}>
                    승인 화면으로
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setApprovalRequests([])}>
                    닫기
                  </Button>
                </>
              }
            />
          ) : null}

          {loading && runs.length === 0 ? (
            <SkeletonGroup aria-label="오늘 현황을 불러오는 중">
              <Skeleton variant="chart" />
            </SkeletonGroup>
          ) : (
            <StatStrip aria-busy={loading} items={statItems} />
          )}

          <StyledBoardRow>
            <DashboardRunsCard
              runs={runs}
              loading={loading}
              hasError={Boolean(error)}
              nowMs={nowMs}
            />
            <DashboardActionsCard runs={runs} unassignedManagers={metrics?.unassignedManagers ?? 0} approvals={approvals} nowMs={nowMs} />
          </StyledBoardRow>

          <StyledBoardRow>
            <StyledBoardCard aria-label="실시간 버스">
              <StyledBoardCardHead>
                <h2>실시간 버스</h2>
                <p>마지막 수신 {lastPositionAt ? formatClockTimeWithSeconds(lastPositionAt) : "-"}</p>
                <StyledMapTabs style={{ marginLeft: "auto" }}>
                  <StyledMapTab type="button" $active={selectedRunId === null} aria-pressed={selectedRunId === null} onClick={() => selectedRunId !== null && handleSelectBus(selectedRunId)}>
                    전체
                  </StyledMapTab>
                  {runs.map((run) => (
                    <StyledMapTab
                      key={run.runId}
                      type="button"
                      $active={run.runId === selectedRunId}
                      aria-pressed={run.runId === selectedRunId}
                      onClick={() => handleSelectBus(run.runId)}
                    >
                      {run.busNo} {DIRECTION_LABEL[run.direction]}
                    </StyledMapTab>
                  ))}
                </StyledMapTabs>
              </StyledBoardCardHead>
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
                  {/* R20-C 목표 5 — 근사 경로 안내를 지도 안으로 올린다(Ruling 309). Ruling 321 — 예정 경로도 "확정된 경로" 로 오인하지 않게 알린다. */}
                  {routeFallback || routePlanned ? (
                    <StyledMapOverlayNotice>
                      {[routePlanned ? "예정 경로 — 확정 시 달라질 수 있음" : null, routeFallback ? "근사 경로" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </StyledMapOverlayNotice>
                  ) : null}
                </StyledMapSurface>
                {/* 운행 중 회차의 현재 → 다음 정차지(§5.18). 위치를 아직 못 받았으면 최근 확인 시각 · 대기 문구로 말한다. */}
                {runs.some((run) => run.runStatus === "moving") ? (
                  <StyledLiveLines aria-label="운행 중인 버스 위치">
                    {runs
                      .filter((run) => run.runStatus === "moving")
                      .map((run) => {
                        const live = liveByRunId.get(run.runId);
                        return (
                          <li key={run.runId}>
                            <b>
                              {run.busNo} {DIRECTION_LABEL[run.direction]}
                            </b>
                            <span>
                              {live?.position
                                ? `현재 ${live.currentStop ?? "-"} → 다음 ${live.nextStop ?? "-"}`
                                : live?.lastSeenAt
                                  ? `최근 확인 ${formatDateTime(live.lastSeenAt)}`
                                  : "위치 확인 대기"}
                            </span>
                          </li>
                        );
                      })}
                  </StyledLiveLines>
                ) : null}
                {mapError ? <AlertBanner tone="missed" title="지도를 불러오지 못했습니다">{mapError}</AlertBanner> : null}
                {routeError ? <AlertBanner tone="missed" title={routeError} /> : null}
                {/* R20-C 목표 4 — "확정됐는데 경로가 없음"(데이터 결손)과 "예정 경로도 없음"(고정 노선 자체가 없음, 정상)을 다른 문구로 가른다(Ruling 321). */}
                {routeMissing ? <StyledFallbackNotice>확정됐지만 경로 정보가 아직 없습니다</StyledFallbackNotice> : null}
                {routeNoPlannedRoute ? (
                  <StyledFallbackNotice>
                    이 회차의 고정 노선이 없습니다 — <Link href="/route">고정 노선 편성에서 등록하세요</Link>
                  </StyledFallbackNotice>
                ) : null}
              </StyledMapPane>
            </StyledBoardCard>

            <StyledBoardCard aria-label="오늘 등원 학생 현황">
              <StyledBoardCardHead>
                <h2>오늘 등원 {toAcademyRiders.total}명</h2>
              </StyledBoardCardHead>
              <StyledBoardCardBody>
                <RiderSplitBar split={toAcademyRiders} total={toAcademyRiders.total} />
                <RiderSplitLegend split={toAcademyRiders} showZero />
                {toAcademyRuns.map((run) => {
                  const split = splitRiders(run);
                  return (
                    <StyledRunRiderBlock key={run.runId}>
                      <header>
                        <strong>
                          {run.busNo} {DIRECTION_LABEL[run.direction]}
                        </strong>
                        <span>
                          {[
                            split.boarded > 0 ? `탑승 완료 ${split.boarded}` : null,
                            split.noShow > 0 ? `미승차 ${split.noShow}` : null,
                            split.absent > 0 ? `미등원 ${split.absent}` : null,
                            split.waiting > 0 ? `대기 ${split.waiting}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "대상 없음"}
                        </span>
                      </header>
                      <RiderSplitBar split={split} total={run.totalCount} thin />
                    </StyledRunRiderBlock>
                  );
                })}
                {fromAcademyRuns.length > 0 ? (
                  <StyledFootnote>
                    하원 {fromAcademyRuns.length}회 · 대상 {fromAcademyRuns.reduce((sum, run) => sum + run.totalCount, 0)}명은 학원 출발 뒤부터 집계됩니다
                  </StyledFootnote>
                ) : null}
              </StyledBoardCardBody>
            </StyledBoardCard>
          </StyledBoardRow>
        </>
      )}
    </StyledDashboardLayout>
  );
};
