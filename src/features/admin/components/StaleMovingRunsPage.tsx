"use client";

import { useCallback, useEffect, useState } from "react";
import { useSavedNotice } from "@/shared/hooks";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { ApiError } from "@/shared/lib/http";
import type { RosterColumn } from "@/shared/types";
import { AlertBanner, Badge, Button, Card, EmptyState, PageHeader, RosterTable } from "@/shared/ui";
import { getStaleMovingRuns } from "../api";
import type { StaleMovingRunItemResponseTypes } from "../types";
import { ForceFinishDialog } from "./ForceFinishDialog";
import { StyledForceConfirmLayout } from "./ForceConfirmPage.styled";

// §6.16 서버가 한 번에 주는 최대 건수 — 이만큼 오면 더 있을 수 있다(오래된 회차부터 자른다).
const STALE_MOVING_RUN_LIMIT = 200;

// §6.16·§6.17 끝나지 않은 이동 중 회차(Ruling 724). `StaleMovingRun` 경보가 세는 회차를 메인 관리자가 학원에 확인한 뒤 닫는다.
// 목록은 서버가 운행일 오름차순으로 준다 — 오래된 회차부터 처리하고, 처리한 행은 다시 불러온 목록에서 사라진다.
export const StaleMovingRunsPage = () => {
  const [runs, setRuns] = useState<StaleMovingRunItemResponseTypes[]>([]);
  const [target, setTarget] = useState<StaleMovingRunItemResponseTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notice, showNotice } = useSavedNotice();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRuns((await getStaleMovingRuns()).items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "끝나지 않은 회차 목록을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // 좁은 폭(1024px)에서 짧은 칸이 글자 단위로 줄바꿈되지 않게 방향·버스·버튼 칸에 폭을 준다. 종료 보류 표시는 탑승 중 칸에 함께 둔다.
  const columns: RosterColumn<StaleMovingRunItemResponseTypes>[] = [
    { key: "academyName", label: "학원" },
    { key: "serviceDate", label: "운행일", width: "112px" },
    { key: "direction", label: "방향", width: "64px", render: (row) => (row.direction === "to_academy" ? "등원" : "하원") },
    { key: "busNo", label: "버스", width: "80px" },
    { key: "startedAt", label: "운행 시작", render: (row) => formatDateTime(row.startedAt) },
    {
      key: "boardedCount",
      label: "탑승 중",
      width: "120px",
      render: (row) => (
        <>
          {row.boardedCount > 0 ? <Badge tone="red">{row.boardedCount}명 미하차</Badge> : "없음"}
          {row.finishPending ? <Badge tone="amber">종료 보류</Badge> : null}
        </>
      ),
    },
    {
      key: "action",
      label: "",
      width: "144px",
      render: (row) => (
        <Button variant="danger" onClick={() => setTarget(row)}>
          강제 종료
        </Button>
      ),
    },
  ];

  return (
    <StyledForceConfirmLayout>
      <PageHeader
        title="끝나지 않은 회차"
        description="운행일이 지났는데 이동 중으로 남은 회차입니다. 학원에 확인한 뒤 종료합니다"
      />

      {notice ? <AlertBanner tone="boarded" title={notice} /> : null}
      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {runs.length >= STALE_MOVING_RUN_LIMIT ? (
        <AlertBanner
          tone="info"
          title={`오래된 회차부터 ${STALE_MOVING_RUN_LIMIT}건만 표시합니다 — 처리하면 다음 회차가 올라옵니다`}
        />
      ) : null}

      <Card padding={0} aria-busy={loading}>
        {!loading && !error && runs.length === 0 ? (
          <EmptyState icon="circle-check" title="끝나지 않은 회차가 없습니다" />
        ) : (
          <RosterTable hasError={Boolean(error)} onRetry={load} columns={columns} loading={loading} rows={runs} getRowKey={(row) => row.runId} />
        )}
      </Card>

      {target ? (
        <ForceFinishDialog
          run={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            showNotice(`${target.academyName} ${target.busNo} 회차를 종료했습니다`);
            setTarget(null);
            load();
          }}
        />
      ) : null}
    </StyledForceConfirmLayout>
  );
};
