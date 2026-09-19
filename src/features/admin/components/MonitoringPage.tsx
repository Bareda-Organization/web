"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import {
  adminLiveDestination,
  parseWsEmergencyRaisedPayload,
  parseWsPositionPayload,
  type WebSocketEnvelope,
} from "@/shared/lib/ws";
import { useRealtimeChannel } from "@/shared/hooks";
import { AlertBanner, Button, Card, EmptyState, PageHeader, RosterTable, Select, StatusPill } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import {
  MapSurface,
  buildRouteDisplayState,
  cameraForSelectedBus,
  type MapCamera,
  type MapMarker,
  type MapPolyline,
} from "@/features/map";
import { getRunRoute } from "@/features/route";
import { getAcademies, getAcademyRunsLive } from "../api";
import type { AcademySummaryResponseTypes, RunLiveItemResponseTypes, RunStatus } from "../types";
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
export const MonitoringPage = () => {
  const [academies, setAcademies] = useState<AcademySummaryResponseTypes[]>([]);
  const [academyId, setAcademyId] = useState<number | null>(null);
  const [runs, setRuns] = useState<RunLiveItemResponseTypes[]>([]);
  const [rosterTarget, setRosterTarget] = useState<RunLiveItemResponseTypes | null>(null);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  // R15-T2 — 우측 버스 목록에서 고른 회차 하나의 노선.
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
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
  const mapMarkers: MapMarker[] = useMemo(
    () =>
      runs
        .filter((run) => run.position != null)
        .map((run) => ({ id: String(run.runId), lat: run.position!.lat, lng: run.position!.lng, kind: "bus" as const })),
    [runs],
  );
  // R19 목표 1 — 지도에 실제로 그리는 마커 = 버스 + 선택된 회차의 정차지.
  const mapMarkersWithStops: MapMarker[] = useMemo(
    () => [...mapMarkers, ...routeStopMarkers],
    [mapMarkers, routeStopMarkers],
  );
  // R18-B2 목표 3 — 확대 수준은 `features/map`(`cameraForSelectedBus`)이 세 화면 몫을
  // 한 곳에서 정한다(R18-B 때 이 화면 안에 있던 상수를 공유 표면으로 올렸다).
  const selectedBusMarker = useMemo(
    () => mapMarkers.find((marker) => marker.id === String(selectedRunId)) ?? null,
    [mapMarkers, selectedRunId],
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
        const data = await getAcademies();
        if (!cancelled) {
          setAcademies(data.items);
          if (data.items.length > 0) {
            setAcademyId(data.items[0].id);
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

  const loadRuns = useCallback(async (id: number) => {
    setLoadingRuns(true);
    try {
      const data = await getAcademyRunsLive(id);
      setRuns(data.runs);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "실시간 회차를 불러오지 못했습니다");
      setRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  // R15-T2 목표 4 — 버스를 고르면 그 노선을 지도에 그린다. 같은 버스를 다시 고르면
  // 선택을 해제한다(DashboardPage.tsx 와 같은 토글).
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
      // Ruling 321 — 확정 경로일 때만 회차 상태별 색(POLYLINE_KIND_BY_STATUS)을
      // 쓴다. 목록에 이미 있는 회차만 고를 수 있어 항상 찾는다.
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

  // Goal 8 — `/topic/admin/live` 구독. 이 채널은 학원 경계를 넘어 전체를
  // 방송하므로(BRIEF-a1.md §2) `runs` 는 화면이 지금 선택한 학원 하나만 들고
  // 있다 — 봉투에는 어느 학원 소속인지 알려주는 필드가 없어(§7 공통 봉투),
  // `runId` 가 지금 목록에 있는 회차와 일치할 때만 직접 갱신하고(`position`),
  // 새 회차 시작·종료처럼 `runs` 자체의 구성이 바뀔 수 있는 이벤트는 지금
  // 선택된 학원으로 `loadRuns` 를 재조회해 반영한다 — DashboardPage 와 같은
  // 판단(payload 조각으로 목록 구조를 재구성하지 않는다, 보고서 §1).
  // `emergency_raised` 는 학원 필터와 무관하게 항상 띄운다 — Goal 8 이 요구하는
  // "모든 학원의 실시간 갱신"의 일부다.
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
          if (academyId != null) {
            loadRuns(academyId);
          }
          return;
        case "emergency_raised": {
          const payload = parseWsEmergencyRaisedPayload(envelope.payload);
          setLiveAlert(`비상 상황 발생 — ${payload.busNo} 호차 (${payload.type})`);
          return;
        }
        default:
          // `approval_requested` 는 관리자 채널에 안 오고(`docs/API_SPEC.md §7`
          // 채널 표), 그 밖의 미지 이벤트는 이 화면이 무시한다.
          return;
      }
    },
    [academyId, loadRuns],
  );
  const { connectionState } = useRealtimeChannel(adminLiveDestination(), handleEnvelope);
  // Goal 9 — "데이터 없음"과 "WebSocket 연결 끊김"을 구분한다. `runs` 는 REST
  // 폴링(7초)이 WS 와 무관하게 계속 채우므로, WS 상태 배너는 목록·EmptyState 를
  // 대체하지 않고 그 위에 별도로 얹는다(DashboardPage.tsx 와 동일 판단).
  const wsIsLost = connectionState === "gaveUp" || connectionState === "forbidden";
  const wsIsReconnecting = connectionState === "reconnecting";

  useEffect(() => {
    if (academyId == null) {
      return;
    }
    let cancelled = false;
    (async () => {
      await loadRuns(academyId);
    })();
    const timer = setInterval(() => {
      if (!cancelled) {
        loadRuns(academyId);
      }
    }, LIVE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [academyId, loadRuns]);

  const columns: RosterColumn<RunLiveItemResponseTypes>[] = [
    { key: "busNo", label: "버스" },
    { key: "direction", label: "구간", render: (row) => DIRECTION_LABEL[row.direction] },
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
      render: (row) => (row.position ? `수신 ${row.position.receivedAt}` : row.lastSeenAt ?? "위치 확인 대기"),
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

      {liveAlert ? <AlertBanner tone="missed" title={liveAlert} /> : null}

      {mapError ? <AlertBanner tone="missed" title="지도를 불러오지 못했습니다">{mapError}</AlertBanner> : null}

      {wsIsLost ? (
        <AlertBanner
          tone="missed"
          title={connectionState === "forbidden" ? "실시간 조회 권한 없음" : "실시간 연결 끊김"}
        >
          {connectionState === "forbidden"
            ? "전체 관제 채널을 볼 권한이 없습니다. 목록은 자동 새로고침으로 계속 갱신됩니다."
            : "실시간 갱신 연결이 끊어졌습니다. 목록은 자동 새로고침으로 계속 갱신됩니다."}
        </AlertBanner>
      ) : null}
      {wsIsReconnecting ? <AlertBanner tone="missed" title="재연결 시도 중입니다" /> : null}

      <StyledFilterRow>
        <Select
          label="학원"
          value={academyId ?? ""}
          onChange={(event) => setAcademyId(Number(event.target.value))}
          options={academies.map((academy) => ({ value: String(academy.id), label: `${academy.name} (${academy.region})` }))}
          disabled={loadingAcademies || academies.length === 0}
        />
      </StyledFilterRow>

      {/* R15-T2 §8.23 목표 2 — 지도가 화면 상단에 가득차고, 그 우측에 버스 목록을 둔다.
          이 화면의 목록은 §6.8 정의상 moving 회차만 대상이다(Ruling 313 — O-05 는
          "운행 중 전 차량" 관제이고, idle·finished 는 stops[].eta 등 필수 필드 자체가
          없어 넓힐 수 없다). 아래 상세 표(EmptyState/RosterTable)는 그대로 둔다. */}
      <StyledMapTopRow>
        <StyledMapPane>
          <StyledMapSurface>
            <MapSurface
              camera={mapCamera}
              markers={mapMarkersWithStops}
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
            <StyledFallbackNotice>등록된 고정 노선이 없어 예정 경로도 없습니다</StyledFallbackNotice>
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
          <RosterTable columns={columns} rows={runs} getRowKey={(row) => row.runId} />
        )}
      </Card>

      {rosterTarget ? (
        <RunRosterDialog runId={rosterTarget.runId} busNo={rosterTarget.busNo} onClose={() => setRosterTarget(null)} />
      ) : null}
    </StyledMonitoringLayout>
  );
};
