"use client";

import { useCallback, useEffect, useState } from "react";
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
import { getAcademies, getAcademyRunsLive } from "../api";
import type { AcademySummaryResponseTypes, RunLiveItemResponseTypes, RunStatus } from "../types";
import { RunRosterDialog } from "./RunRosterDialog";
import { StyledFilterRow, StyledMapSurface, StyledMonitoringLayout } from "./MonitoringPage.styled";

// §5.18 과 같은 근거로 5~10초 폴링 중간값 7초를 그대로 따른다(run/components/DashboardPage.tsx 참고).
const LIVE_POLL_INTERVAL_MS = 7000;

const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  idle: "대기",
  confirmed: "확정",
  moving: "이동 중",
  finished: "종료",
};

const RUN_STATUS_TO_PILL: Record<RunStatus, "boarded" | "moving" | "missed" | "idle"> = {
  idle: "idle",
  confirmed: "idle",
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
    { key: "driver", label: "기사", render: (row) => row.driver.name },
    { key: "escort", label: "동승 매니저", render: (row) => row.escort.name },
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

      {/* F4 에서 지도가 들어갈 자리 — 위치 좌표는 표로만 노출한다 */}
      <StyledMapSurface aria-hidden="true" />

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
