"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth";
import { ApiError } from "@/shared/lib/http";
import {
  academyLiveDestination,
  parseWsEmergencyRaisedPayload,
  parseWsApprovalRequestedPayload,
  parseWsPositionPayload,
  type WebSocketEnvelope,
} from "@/shared/lib/ws";
import { useRealtimeChannel } from "@/shared/hooks";
import { AlertBanner, Card, PageHeader, RosterTable, StatCard, StatusPill } from "@/shared/ui";
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
import { formatClockTimeWithSeconds } from "@/shared/lib/format/clockTime";
import { getDashboard, getRunsLive } from "../api";
import type { DashboardRunResponseTypes, RunLiveItemResponseTypes, RunStatus } from "../types";
import {
  StyledDashboardLayout,
  StyledStatGrid,
  StyledMapTopRow,
  StyledMapPane,
  StyledFallbackNotice,
  StyledMapOverlayNotice,
  StyledBusListPane,
  StyledBusListEmpty,
  StyledBusListItem,
  StyledBusListItemHeader,
  StyledBusListItemMeta,
  StyledMapSurface,
} from "./DashboardPage.styled";

// §5.18 이 5~10초 폴링 대상이라고 명시(LOC-01) — 중간값 7초를 썼다(판단 근거, 보고서 §1).
const LIVE_POLL_INTERVAL_MS = 7000;

// MonitoringPage.tsx 와 같은 기본 좌표(서울 시청) — 위치 수신 전에도 지도가 빈 화면이
// 아니게 한다.
const DEFAULT_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

// R15-T2 §8.23 목표 3 이 못박은 표기 그대로 — idle(대기)·confirmed(확정)·
// moving(운행 중)·finished(운행 종료). `finished` 도 이 목록에서 걸러내지 않는다
// (사용자 확정 — "운행종료 버스도 목록에 남긴다").
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

const DIRECTION_LABEL: Record<DashboardRunResponseTypes["direction"], string> = {
  to_academy: "등원",
  from_academy: "하원",
};

// §5.3 GET /staff/dashboard(A-03) + §5.18 GET /staff/runs/live(A-04) — 관계자 웹
// 운행 관리 첫 화면(UF-M-05). 실시간 카드 안의 지도는 F4-B 에서 실제 네이버 지도로
// 대체됐고, 명단·진행률·지연은 그대로 표로 그린다.
export const DashboardPage = () => {
  const router = useRouter();
  const { session } = useAuthSession();
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getDashboard>>["metrics"] | null>(null);
  const [runs, setRuns] = useState<DashboardRunResponseTypes[]>([]);
  const [liveRuns, setLiveRuns] = useState<RunLiveItemResponseTypes[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  // R15-T2 — 우측 버스 목록에서 고른 회차 하나의 노선. 목록 자체는 `runs`(getDashboard,
  // 4종 상태 전부)를 쓰고, 위치만 `liveRuns`(getRunsLive, moving 전용)에서 run_id 로
  // 합친다(§8.23 목표 3 이 못박은 함정 회피).
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
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

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getDashboard();
      setMetrics(data.metrics);
      setRuns(data.runs);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "대시보드를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLive = useCallback(async () => {
    try {
      const data = await getRunsLive();
      setLiveRuns(data.runs);
    } catch {
      // 실시간 카드는 보조 정보라 실패해도 본문 오류로 승격하지 않는다 — 다음 폴링에서 회복.
    }
  }, []);

  // R15-T2 목표 4 — 버스를 고르면 그 노선을 지도에 그린다. 같은 버스를 다시 고르면
  // 선택을 해제한다(토글) — 목표 4 "선택 해제도 검사"가 요구하는 짝.
  const handleSelectBus = useCallback(
    async (runId: number) => {
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

  // R23 목표 4 — 지도 위 마커 클릭. 버스 마커의 id 만 회차 번호이고 정차지·출발지·도착지는
  // `stop-`·`origin-` 처럼 접두어가 붙는다 — 숫자로 읽히는 것만 회차 선택으로 넘긴다.
  const handleSelectMarker = useCallback(
    (markerId: string) => {
      const runId = Number(markerId);
      if (Number.isInteger(runId) && markerId !== "") {
        handleSelectBus(runId);
      }
    },
    [handleSelectBus],
  );

  // Goal 7 — `/topic/academy/{academyId}/live` 구독. `position` 은 payload 가
  // 화면에 필요한 필드(lat·lng·currentStopName)를 전부 담고 있어 `liveRuns` 를
  // 직접 갱신하고, 나머지 회차 상태 변화(`stop_arrived`·`rider_changed`·
  // `run_started`·`run_ended`) 는 payload 가 `progress`·`nextStop` 같은 화면
  // 필드를 안 담고 있어 `loadLive()` 재조회로 반영한다 — 7초 폴링보다 먼저
  // 최신값을 받는 효과만 노리고, payload 조각으로 상태를 억지로 재구성하지
  // 않는다(판단 근거, 보고서 §1). `AuthGateGuard` 가 관계자 role 에서만 이
  // 화면을 그리므로 `session.academy` 는 항상 값이 있다고 본다(서버 불변식).
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
        case "stop_arrived":
        case "rider_changed":
        case "run_started":
        case "run_ended":
          loadLive();
          return;
        case "emergency_raised": {
          const payload = parseWsEmergencyRaisedPayload(envelope.payload);
          setLiveAlert(`비상 상황 발생 — ${payload.busNo} (${payload.type})`);
          return;
        }
        case "approval_requested": {
          const payload = parseWsApprovalRequestedPayload(envelope.payload);
          setLiveAlert(`탑승 승인 요청 — ${payload.studentName} (${payload.stopName})`);
          return;
        }
        default:
          // 미지 이벤트(`eventWireValue` 로 원문 보존) — 이 화면은 무시한다.
          return;
      }
    },
    [loadLive],
  );
  const { connectionState } = useRealtimeChannel(academyLiveDestination(session?.academy?.id ?? ""), handleEnvelope);
  // Goal 9 — "데이터 없음"과 "WebSocket 연결 끊김"을 구분한다. `liveRuns` 는
  // REST 폴링(7초)이 WS 와 무관하게 계속 채우므로, WS 상태 배너는 목록을
  // 대체하지 않고 그 위에 별도로 얹는다 — WS 가 끊겨도 REST 로 받은 "지금
  // 이동 중인 버스가 없습니다"는 여전히 사실이라 숨기면 오히려 잘못된 정보다
  // (판단 근거, 보고서 §1).
  const wsIsLost = connectionState === "gaveUp" || connectionState === "forbidden";
  const wsIsReconnecting = connectionState === "reconnecting";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadDashboard();
      if (!cancelled) {
        await loadLive();
      }
    })();
    const timer = setInterval(() => {
      if (!cancelled) {
        loadLive();
      }
    }, LIVE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [loadDashboard, loadLive]);

  const noShowRuns = runs.filter((run) => run.noShowCases.length > 0);

  const columns: RosterColumn<DashboardRunResponseTypes>[] = [
    { key: "busNo", label: "버스" },
    { key: "direction", label: "구간", render: (row) => DIRECTION_LABEL[row.direction] },
    {
      key: "runStatus",
      label: "상태",
      render: (row) => (
        <StatusPill status={RUN_STATUS_TO_PILL[row.runStatus]}>{RUN_STATUS_LABEL[row.runStatus]}</StatusPill>
      ),
    },
    { key: "driverName", label: "기사", render: (row) => row.driverName ?? "미배치" },
    { key: "escortName", label: "동승 매니저", render: (row) => row.escortName ?? "미배치" },
    {
      // R21-B 목표 1·3·4 — 예정 출발은 항상 있고, 실제 출발은 회차가 실제로 출발한
      // 뒤에만 채워진다(§5.3 startedAt). 초까지 보여 달라는 지시라 `formatClockTime`
      // (시:분)이 아니라 `formatClockTimeWithSeconds` 를 쓴다.
      key: "departTime",
      label: "출발",
      render: (row) => (
        <>
          예정 {formatClockTimeWithSeconds(row.departTime)}
          {row.startedAt ? (
            <>
              <br />
              실제 {formatClockTimeWithSeconds(row.startedAt)}
            </>
          ) : null}
        </>
      ),
    },
    {
      // R21-B2 목표 1·2 — 출발 컬럼과 대칭으로 예정/실제를 함께 보여준다. 예정 도착은
      // §5.3 est_arrival_time(depart_time + est_duration_min) — 회차에 소요 시간
      // 추정치가 없으면 서버가 null 을 주므로 "-"로 견딘다(그 이유는 여기서 알 수
      // 없어 값만 비운다, 보고서 §2).
      key: "finishedAt",
      label: "도착",
      render: (row) => (
        <>
          예정 {row.estArrivalTime ? formatClockTimeWithSeconds(row.estArrivalTime) : "-"}
          {row.finishedAt ? (
            <>
              <br />
              실제 {formatClockTimeWithSeconds(row.finishedAt)}
            </>
          ) : null}
        </>
      ),
    },
    { key: "boardedCount", label: "탑승", render: (row) => `${row.boardedCount}/${row.totalCount}` },
    {
      key: "changes",
      label: "변경",
      render: (row) =>
        row.addedCount || row.removedCount ? `+${row.addedCount} / -${row.removedCount}` : "-",
    },
  ];

  return (
    <StyledDashboardLayout>
      <PageHeader title="운행 관리" description="오늘 회차의 운행 현황을 한눈에 확인합니다" />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      {liveAlert ? <AlertBanner tone="missed" title={liveAlert} /> : null}

      {noShowRuns.length > 0 ? (
        <AlertBanner
          tone="missed"
          title={`미탑승 확인 대기 ${noShowRuns.reduce((sum, run) => sum + run.noShowCases.length, 0)}건`}
        />
      ) : null}

      <StyledStatGrid aria-busy={loading}>
        <StatCard label="운행 중 버스" value={metrics?.movingBuses ?? "-"} unit="대" icon="bus" tone="moving" />
        <StatCard label="탑승 완료" value={metrics?.boarded ?? "-"} unit="명" icon="check" tone="boarded" />
        <StatCard label="미탑승" value={metrics?.noShow ?? "-"} unit="명" icon="alert-triangle" tone="missed" />
        <StatCard label="결석" value={metrics?.absent ?? "-"} unit="명" icon="user-x" />
        <StatCard label="매니저 미배치" value={metrics?.unassignedManagers ?? "-"} unit="건" icon="user-round-x" />
      </StyledStatGrid>

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
            <StyledFallbackNotice>등록된 고정 노선이 없어 예정 경로도 없습니다</StyledFallbackNotice>
          ) : null}
        </StyledMapPane>

        <StyledBusListPane>
          <p>버스 현황</p>
          {wsIsLost ? (
            <AlertBanner
              tone="missed"
              title={connectionState === "forbidden" ? "실시간 조회 권한 없음" : "실시간 연결 끊김"}
            >
              {connectionState === "forbidden"
                ? "이 학원의 실시간 갱신을 볼 권한이 없습니다. 목록은 자동 새로고침으로 계속 갱신됩니다."
                : "실시간 갱신 연결이 끊어졌습니다. 목록은 자동 새로고침으로 계속 갱신됩니다."}
            </AlertBanner>
          ) : null}
          {wsIsReconnecting ? <AlertBanner tone="missed" title="재연결 시도 중입니다" /> : null}
          {runs.length === 0 ? (
            <StyledBusListEmpty>오늘 등록된 회차가 없습니다</StyledBusListEmpty>
          ) : (
            runs.map((run) => {
              const live = liveByRunId.get(run.runId);
              return (
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
                  {run.runStatus === "moving" ? (
                    <StyledBusListItemMeta>
                      {live?.position
                        ? `현재 ${live.currentStop ?? "-"} → 다음 ${live.nextStop ?? "-"}`
                        : live?.lastSeenAt
                          ? `최근 확인 ${live.lastSeenAt}`
                          : "위치 확인 대기"}
                    </StyledBusListItemMeta>
                  ) : null}
                </StyledBusListItem>
              );
            })
          )}
        </StyledBusListPane>
      </StyledMapTopRow>

      <Card padding={0}>
        <RosterTable
          columns={columns}
          rows={runs}
          getRowKey={(row) => row.runId}
          onRowClick={(row) => router.push(`/today-run?runId=${row.runId}`)}
        />
      </Card>
    </StyledDashboardLayout>
  );
};
