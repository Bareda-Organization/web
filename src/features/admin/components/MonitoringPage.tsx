"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
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
        {!loadingAcademies && academies.length === 0 ? (
          <EmptyState icon="building" title="등록된 학원이 없습니다" />
        ) : runs.length === 0 && !loadingRuns ? (
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
