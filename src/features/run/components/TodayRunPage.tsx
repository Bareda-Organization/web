"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, RosterTable, StatusPill } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getDashboard, getRunRoster } from "../api";
import type { DashboardRunResponseTypes, RosterItemResponseTypes, RosterStatus } from "../types";
import { ForcedAddDialog } from "./ForcedAddDialog";
import { ManagerAssignmentDialog } from "./ManagerAssignmentDialog";
import {
  StyledTodayRunLayout,
  StyledBusSwitcher,
  StyledBusSwitcherButton,
  StyledContentGrid,
  StyledSidePanel,
  StyledMapSurface,
  StyledCrewRow,
  StyledCrewLabel,
} from "./TodayRunPage.styled";

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

  const selectedRunId = runIdParam ? Number(runIdParam) : (runs[0]?.runId ?? null);
  const selectedRun = useMemo(() => runs.find((run) => run.runId === selectedRunId) ?? null, [runs, selectedRunId]);

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

  useEffect(() => {
    (async () => {
      await loadRuns();
    })();
  }, [loadRuns]);

  useEffect(() => {
    if (selectedRunId == null) return;
    (async () => {
      await loadRoster(selectedRunId);
    })();
  }, [selectedRunId, loadRoster]);

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

      <StyledBusSwitcher>
        {runs.map((run) => (
          <StyledBusSwitcherButton
            key={run.runId}
            type="button"
            $active={run.runId === selectedRunId}
            onClick={() => router.replace(`/today-run?runId=${run.runId}`)}
          >
            {run.busNo} · {DIRECTION_LABEL[run.direction]}
          </StyledBusSwitcherButton>
        ))}
      </StyledBusSwitcher>

      <StyledContentGrid>
        <Card padding={0} aria-busy={loading}>
          <RosterTable columns={columns} rows={roster} getRowKey={(row) => row.studentId} />
        </Card>

        <StyledSidePanel>
          <Card>
            <p>노선</p>
            {/* F4 에서 지도가 들어갈 자리 */}
            <StyledMapSurface aria-hidden="true" />
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
