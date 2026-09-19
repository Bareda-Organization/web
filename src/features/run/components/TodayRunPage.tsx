"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, RosterTable, StatusPill } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { MapSurface, type MapCamera, type MapMarker, type MapPolyline } from "@/features/map";
import { getRunRoute } from "@/features/route";
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
import {
  StyledTodayRunLayout,
  StyledMapTopRow,
  StyledMapPane,
  StyledFallbackNotice,
  StyledBusListPane,
  StyledBusListItem,
  StyledBusListItemHeader,
  StyledContentGrid,
  StyledSidePanel,
  StyledMapSurface,
  StyledCrewRow,
  StyledCrewLabel,
} from "./TodayRunPage.styled";

// DashboardPage.tsx·MonitoringPage.tsx 와 같은 기본 좌표(서울 시청). `DashboardRunResponseTypes`·
// `RosterItemResponseTypes` 는 좌표 필드가 없지만(승하차지는 `stopName` 문자열만 응답에 실린다 —
// `run/types/index.ts`), `§5.18 GET /staff/runs/live`(`getRunsLive`)는 선택된 회차가 이동 중이면
// `position{lat,lng}` 을 준다 — 버스 마커는 그 응답에서 채운다(판단 근거, 보고서 §1). 위치
// 미수신 상태(`position=null`)에서는 지도가 이 기본 좌표를 그대로 보여준다.
const DEFAULT_CAMERA: MapCamera = { lat: 37.5666103, lng: 126.9783882, zoom: 12 };

// §5.4 응답의 `absent` 는 매니저 앱과 반대로 계속 빨간색(missed)으로 유지해야 한다
// (API_SPEC §5.4) — 공용 StudentRow 의 RIDE_META 는 absent 를 idle 로 다뤄서 여기선
// 안 쓰고 화면 전용 매핑을 둔다(판단 근거, 보고서 §1).
const STATUS_LABEL: Record<RosterStatus, string> = {
  waiting: "대기",
  boarded: "탑승 완료",
  alighted: "하차 완료",
  absent: "결석",
  no_show: "미탑승",
};

const STATUS_PILL: Record<RosterStatus, "boarded" | "moving" | "missed" | "idle"> = {
  waiting: "idle",
  boarded: "boarded",
  alighted: "boarded",
  absent: "missed",
  no_show: "missed",
};

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

const RUN_STATUS_TO_PILL: Record<RunStatus, "boarded" | "moving" | "missed" | "idle"> = {
  idle: "idle",
  confirmed: "idle",
  moving: "moving",
  finished: "boarded",
};

// §5.4 GET /staff/runs/{runId}/roster(A-06) · §5.7 POST .../forced-add(A-07) ·
// §5.14 PATCH .../assignment(A-06) — 금일 운행 상세(UF-M-03·UF-M-04). §5.8(전학·이동)은
// BRIEF-w1 담당 절 목록에 없어 범위 밖이다(A-07 이름이 겹쳐 보이지만 절 목록이 기준).
export const TodayRunPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get("runId");

  const [runs, setRuns] = useState<DashboardRunResponseTypes[]>([]);
  const [roster, setRoster] = useState<RosterItemResponseTypes[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [forcedAddOpen, setForcedAddOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [liveRun, setLiveRun] = useState<RunLiveItemResponseTypes | null>(null);
  // R15-T2 — 우측 버스 목록에서 고른(=지금 화면에 뜬) 회차의 노선.
  const [routePolylines, setRoutePolylines] = useState<MapPolyline[]>([]);
  const [routeFallback, setRouteFallback] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const selectedRunId = runIdParam ? Number(runIdParam) : (runs[0]?.runId ?? null);
  const selectedRun = useMemo(() => runs.find((run) => run.runId === selectedRunId) ?? null, [runs, selectedRunId]);

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      liveRun?.position
        ? [{ id: String(liveRun.runId), lat: liveRun.position.lat, lng: liveRun.position.lng, kind: "bus" as const }]
        : [],
    [liveRun],
  );
  const mapCamera: MapCamera = useMemo(
    () => (mapMarkers[0] ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng, zoom: DEFAULT_CAMERA.zoom } : DEFAULT_CAMERA),
    [mapMarkers],
  );

  const loadRuns = useCallback(async () => {
    try {
      const data = await getDashboard();
      setRuns(data.runs);
      if (!runIdParam && data.runs[0]) {
        router.replace(`/today-run?runId=${data.runs[0].runId}`);
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "회차 목록을 불러오지 못했습니다");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRoster = useCallback(async (runId: number) => {
    setLoading(true);
    try {
      const items = await getRunRoster(runId);
      setRoster(items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "명단을 불러오지 못했습니다");
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // §5.18 은 `status='moving'` 인 회차만 돌려준다 — 선택된 회차가 없으면(대기·종료)
  // `liveRun` 은 null 로 남고 지도는 기본 좌표를 보여준다. 위치 카드는 보조 정보라
  // 실패해도 본문 오류로 승격하지 않는다(DashboardPage.tsx 의 loadLive 와 같은 판단).
  const loadLiveRun = useCallback(async (runId: number) => {
    try {
      const data = await getRunsLive();
      setLiveRun(data.runs.find((run) => run.runId === runId) ?? null);
    } catch {
      setLiveRun(null);
    }
  }, []);

  // R15-T2 목표 4 — 지금 화면에 뜬 회차의 §5.19 노선을 지도에 그린다. 이 화면은
  // 항상 회차 하나가 선택된 상태라(대기 상태가 없다) DashboardPage.tsx 와 달리
  // 선택 해제 토글은 두지 않는다(보고서 §2, 판단 근거).
  const loadRoute = useCallback(async (runId: number) => {
    setRouteError(null);
    try {
      const route = await getRunRoute(runId);
      setRoutePolylines(
        route.roadPath.length > 0 ? [{ id: `route-${runId}`, points: route.roadPath, kind: "route" as const }] : [],
      );
      setRouteFallback(route.fallbackUsed);
    } catch (cause) {
      setRoutePolylines([]);
      setRouteFallback(false);
      setRouteError(cause instanceof ApiError ? cause.message : "노선을 불러오지 못했습니다");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadRuns();
    })();
  }, [loadRuns]);

  useEffect(() => {
    if (selectedRunId == null) return;
    (async () => {
      await loadRoster(selectedRunId);
      await loadLiveRun(selectedRunId);
      await loadRoute(selectedRunId);
    })();
  }, [selectedRunId, loadRoster, loadLiveRun, loadRoute]);

  const columns: RosterColumn<RosterItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "className", label: "반", render: (row) => row.className ?? "-" },
    { key: "stopName", label: "승하차지" },
    { key: "guardianPhone", label: "보호자 연락처" },
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
              <Button variant="primary" onClick={() => setForcedAddOpen(true)}>
                강제 승하차지 추가
              </Button>
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
              markers={mapMarkers}
              polylines={routePolylines}
              onAuthFailed={(exception) =>
                setMapError(exception instanceof Error ? exception.message : "알 수 없는 인증 오류")
              }
            />
          </StyledMapSurface>
          {mapError ? <AlertBanner tone="missed" title="지도를 불러오지 못했습니다">{mapError}</AlertBanner> : null}
          {routeError ? <AlertBanner tone="missed" title={routeError} /> : null}
          {/* Ruling 309 — 근사 경로(직선)를 실제 경로로 오인하지 않도록 반드시 표시한다. */}
          {routeFallback ? <StyledFallbackNotice>근사 경로</StyledFallbackNotice> : null}
        </StyledMapPane>

        <StyledBusListPane>
          {runs.map((run) => (
            <StyledBusListItem
              key={run.runId}
              type="button"
              $active={run.runId === selectedRunId}
              onClick={() => router.replace(`/today-run?runId=${run.runId}`)}
            >
              <StyledBusListItemHeader>
                <span>
                  {run.busNo} · {DIRECTION_LABEL[run.direction]}
                </span>
                <StatusPill status={RUN_STATUS_TO_PILL[run.runStatus]}>{RUN_STATUS_LABEL[run.runStatus]}</StatusPill>
              </StyledBusListItemHeader>
            </StyledBusListItem>
          ))}
        </StyledBusListPane>
      </StyledMapTopRow>

      <StyledContentGrid>
        <Card padding={0} aria-busy={loading}>
          <RosterTable columns={columns} rows={roster} getRowKey={(row) => row.studentId} />
        </Card>

        <StyledSidePanel>
          <Card>
            <p>현재 위치</p>
            <StyledCrewRow>
              <StyledCrewLabel>현재 위치</StyledCrewLabel>
              <span>
                {liveRun?.position
                  ? `현재 ${liveRun.currentStop ?? "-"} → 다음 ${liveRun.nextStop ?? "-"}`
                  : liveRun?.lastSeenAt
                    ? `최근 확인 ${liveRun.lastSeenAt}`
                    : "위치 확인 대기"}
              </span>
            </StyledCrewRow>
            <StyledCrewRow>
              <StyledCrewLabel>기사</StyledCrewLabel>
              <span>{selectedRun?.driverName ?? "미배치"}</span>
            </StyledCrewRow>
            <StyledCrewRow>
              <StyledCrewLabel>동승 매니저</StyledCrewLabel>
              <span>{selectedRun?.escortName ?? "미배치"}</span>
            </StyledCrewRow>
            <StyledCrewRow>
              <StyledCrewLabel>출발 시각</StyledCrewLabel>
              <span>{selectedRun?.departTime ?? "-"}</span>
            </StyledCrewRow>
          </Card>
        </StyledSidePanel>
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
