"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Card, PageHeader, RosterTable, StatCard, StatusPill } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getDashboard, getRunsLive } from "../api";
import type { DashboardRunResponseTypes, RunLiveItemResponseTypes, RunStatus } from "../types";
import {
  StyledDashboardLayout,
  StyledStatGrid,
  StyledContentGrid,
  StyledLiveCard,
  StyledLiveEmpty,
  StyledLiveItem,
  StyledLiveItemHeader,
  StyledLiveItemMeta,
  StyledMapSurface,
} from "./DashboardPage.styled";

// §5.18 이 5~10초 폴링 대상이라고 명시(LOC-01) — 중간값 7초를 썼다(판단 근거, 보고서 §1).
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

const DIRECTION_LABEL: Record<DashboardRunResponseTypes["direction"], string> = {
  to_academy: "등원",
  from_academy: "하원",
};

// §5.3 GET /staff/dashboard(A-03) + §5.18 GET /staff/runs/live(A-04) — 관계자 웹
// 운행 관리 첫 화면(UF-M-05). 지도는 F4 범위라 실시간 카드 안은 빈 표면만 두고
// 명단·진행률·지연은 전부 그린다.
export const DashboardPage = () => {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getDashboard>>["metrics"] | null>(null);
  const [runs, setRuns] = useState<DashboardRunResponseTypes[]>([]);
  const [liveRuns, setLiveRuns] = useState<RunLiveItemResponseTypes[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

      <StyledContentGrid>
        <Card padding={0}>
          <RosterTable
            columns={columns}
            rows={runs}
            getRowKey={(row) => row.runId}
            onRowClick={(row) => router.push(`/today-run?runId=${row.runId}`)}
          />
        </Card>

        <StyledLiveCard>
          <Card>
            <p>실시간 위치</p>
            {/* F4 에서 지도가 들어갈 자리 */}
            <StyledMapSurface aria-hidden="true" />
            {liveRuns.length === 0 ? (
              <StyledLiveEmpty>지금 이동 중인 버스가 없습니다</StyledLiveEmpty>
            ) : (
              liveRuns.map((run) => (
                <StyledLiveItem key={run.runId}>
                  <StyledLiveItemHeader>
                    <span>{run.busNo}</span>
                    <StatusPill status="moving">이동 중</StatusPill>
                  </StyledLiveItemHeader>
                  <StyledLiveItemMeta>
                    {run.position
                      ? `현재 ${run.currentStop ?? "-"} → 다음 ${run.nextStop ?? "-"}`
                      : run.lastSeenAt
                        ? `최근 확인 ${run.lastSeenAt}`
                        : "위치 확인 대기"}
                  </StyledLiveItemMeta>
                  <StyledLiveItemMeta>
                    진행 {run.progress.done}/{run.progress.total}
                    {run.delayMinutes ? ` · 지연 ${run.delayMinutes}분` : ""}
                  </StyledLiveItemMeta>
                </StyledLiveItem>
              ))
            )}
          </Card>
        </StyledLiveCard>
      </StyledContentGrid>
    </StyledDashboardLayout>
  );
};
