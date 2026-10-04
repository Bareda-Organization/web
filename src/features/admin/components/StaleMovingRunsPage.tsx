"use client";

import { useCallback, useEffect, useState } from "react";
import { useSavedNotice } from "@/shared/hooks";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { ApiError } from "@/shared/lib/http";
import type { RosterColumn } from "@/shared/types";
import { AlertBanner, Button, Card, EmptyState, PageHeader, RosterTable, StatStrip, StatusChip } from "@/shared/ui";
import { LinkButton } from "@/shared/ui/display";
import { getStaleMovingRuns } from "../api";
import { academyDotColor } from "../lib/relativeTime";
import { serviceDateLabel } from "../lib/staleRuns";
import type { StaleMovingRunItemResponseTypes } from "../types";
import { ForceFinishDialog } from "./ForceFinishDialog";
import { StyledBandSlot, StyledBusCell, StyledForceConfirmLayout, StyledTwoLine } from "./ForceConfirmPage.styled";
import { StyledAcademyDot, StyledActionPair, StyledAcademyName, StyledCardHeading } from "./StaleMovingRunsPage.styled";

// §6.16 서버가 한 번에 주는 최대 건수 — 이만큼 오면 더 있을 수 있다(오래된 회차부터 자른다).
const STALE_MOVING_RUN_LIMIT = 200;

// §6.16·§6.17 끝나지 않은 이동 중 회차(Ruling 724). `StaleMovingRun` 경보가 세는 회차를 메인 관리자가 학원에 확인한 뒤 닫는다.
// 목록은 서버가 운행일 오름차순으로 준다 — 오래된 회차부터 처리하고, 처리한 행은 다시 불러온 목록에서 사라진다.
// R48 시안: 지표 3칸 · 처리 순서 안내 · 행마다 [학원에 전화](Ruling 808) → [강제 종료] 순서.
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

  const boardedTotal = runs.reduce((sum, run) => sum + run.boardedCount, 0);
  const mostBoarded = [...runs].sort((a, b) => b.boardedCount - a.boardedCount)[0];
  const oldest = runs[0]; // 서버가 운행일 오름차순으로 준다(§6.16)
  const oldestLabel = oldest ? serviceDateLabel(oldest.serviceDate) : null;

  const columns: RosterColumn<StaleMovingRunItemResponseTypes>[] = [
    {
      key: "academyName",
      label: "학원",
      render: (row) => (
        <StyledAcademyName>
          <StyledAcademyDot $color={academyDotColor(row.academyName)} aria-hidden="true" />
          <b>{row.academyName}</b>
          <small>{row.academyContact ?? "연락처 미등록"}</small>
        </StyledAcademyName>
      ),
    },
    {
      key: "serviceDate",
      label: "운행일",
      render: (row) => {
        const label = serviceDateLabel(row.serviceDate);
        return (
          <StyledTwoLine>
            <span>{label.date}</span>
            <small>{label.days}일째</small>
          </StyledTwoLine>
        );
      },
    },
    {
      key: "busNo",
      label: "호차 · 방향",
      render: (row) => (
        <StyledBusCell>
          <b>{row.busNo}</b>
          <small>{row.direction === "to_academy" ? "등원" : "하원"}</small>
        </StyledBusCell>
      ),
    },
    { key: "startedAt", label: "운행 시작", render: (row) => (row.startedAt ? formatClockTime(row.startedAt) : "-") },
    {
      key: "boardedCount",
      label: "탑승 중",
      render: (row) => (
        <>
          {row.boardedCount > 0 ? <StatusChip tone="bad">{row.boardedCount}명 미하차</StatusChip> : <span style={{ color: "var(--text-secondary)" }}>없음</span>}
          {row.finishPending ? (
            <>
              {" "}
              <StatusChip tone="warn" marker={false}>
                종료 보류
              </StatusChip>
            </>
          ) : null}
        </>
      ),
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <StyledActionPair>
          {row.academyContact ? (
            <LinkButton href={`tel:${row.academyContact}`} aria-label={`${row.academyName} ${row.busNo} 학원에 전화`}>
              학원에 전화
            </LinkButton>
          ) : null}
          <Button variant="dangerQuiet" size="sm" aria-label={`${row.academyName} ${row.busNo} 강제 종료`} onClick={() => setTarget(row)}>
            강제 종료
          </Button>
        </StyledActionPair>
      ),
    },
  ];

  return (
    <StyledForceConfirmLayout>
      <PageHeader style={{ marginBottom: 20 }} title="끝나지 않은 회차" description="운행일이 지났는데 ‘운행 중’으로 남은 회차 — 학원에 먼저 확인한 뒤 종료합니다" />

      {notice ? (
        <StyledBandSlot>
          <AlertBanner tone="boarded" title={notice} />
        </StyledBandSlot>
      ) : null}
      {error ? (
        <StyledBandSlot>
          <AlertBanner tone="missed" title={error} />
        </StyledBandSlot>
      ) : null}

      {!error && !loading ? (
        <StatStrip
          items={[
            { label: "끝나지 않은 회차", value: runs.length, unit: "건", tone: runs.length > 0 ? "warn" : "neutral", detail: "운행일이 이틀 이상 지난 ‘운행 중’" },
            {
              label: "하차 처리 안 된 탑승자",
              value: boardedTotal,
              unit: "명",
              tone: boardedTotal > 0 ? "bad" : "neutral",
              detail: mostBoarded && mostBoarded.boardedCount > 0 ? `${mostBoarded.academyName} ${mostBoarded.busNo} ${mostBoarded.direction === "to_academy" ? "등원" : "하원"}` : "남은 탑승자 없음",
            },
            {
              label: "가장 오래된 회차",
              value: oldestLabel ? oldestLabel.days : "—",
              unit: oldestLabel ? "일째" : undefined,
              detail: oldest && oldestLabel ? `${oldest.academyName} · ${oldestLabel.date}` : "해당 없음",
            },
          ]}
        />
      ) : null}

      <StyledBandSlot>
        <AlertBanner tone="info" title="처리 순서 — ① 학원에 전화로 남은 탑승자 확인 → ② 강제 종료">
          지난 운행이라 하차 시각을 만들 수 없어, 강제 종료는 탑승자 기록을 바꾸지 않고 학부모·관계자 알림도 보내지 않습니다. 회차만 닫습니다.
        </AlertBanner>
      </StyledBandSlot>

      {runs.length >= STALE_MOVING_RUN_LIMIT ? (
        <StyledBandSlot>
          <AlertBanner tone="info" title={`오래된 회차부터 ${STALE_MOVING_RUN_LIMIT}건만 표시합니다 — 처리하면 다음 회차가 올라옵니다`} />
        </StyledBandSlot>
      ) : null}

      {!loading && !error && runs.length === 0 ? (
        <Card padding={0}>
          <EmptyState icon="circle-check" title="끝나지 않은 회차가 없습니다">
            운행일이 이틀 이상 지났는데 ‘운행 중’으로 남은 회차가 생기면 여기에 나타납니다.
          </EmptyState>
        </Card>
      ) : (
        <Card padding={0} aria-busy={loading}>
          <StyledCardHeading>{error ? "끝나지 않은 회차" : `끝나지 않은 회차 ${runs.length}건`}</StyledCardHeading>
          <RosterTable
            hasError={Boolean(error)}
            onRetry={load}
            {...{ style: { background: "transparent", boxShadow: "none", borderRadius: 0 } }}
            columns={columns}
            loading={loading}
            rows={runs}
            getRowKey={(row) => row.runId}
            rowTone={(row) => (row.boardedCount > 0 ? "warn" : undefined)}
          />
        </Card>
      )}

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
