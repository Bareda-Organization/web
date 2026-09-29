"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, EmptyState, PageHeader, RosterTable, Select } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAcademies, getAcademyRunsLive } from "../api";
import type { AcademySummaryResponseTypes, RunLiveItemResponseTypes } from "../types";
import { ForceConfirmDialog } from "./ForceConfirmDialog";
import { StyledFilterRow, StyledForceConfirmLayout } from "./ForceConfirmPage.styled";
import { formatDateTime } from "@/shared/lib/format/dateTime";

// §6.14 회차 강제 확정(O-06). 확정이 계속 실패한 회차를 골라내는 화면이라 idle 상태
// 회차만 대상으로 두고, 실제 confirm_at 도래 여부는 백엔드 판정(409 RUN_NOT_DUE)에
// 맡긴다 — 이 목록 API(§6.8)엔 confirm_at 이 없어 클라이언트에서 선판단할 수 없다
// (우려·확신 없는 지점, 보고서 §2).
export const ForceConfirmPage = () => {
  const [academies, setAcademies] = useState<AcademySummaryResponseTypes[]>([]);
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunLiveItemResponseTypes[]>([]);
  const [target, setTarget] = useState<RunLiveItemResponseTypes | null>(null);
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

  const loadRuns = useCallback(async (id: string) => {
    setLoadingRuns(true);
    try {
      const data = await getAcademyRunsLive(id);
      setRuns(data.runs.filter((run) => run.runStatus === "idle"));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "회차 목록을 불러오지 못했습니다");
      setRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    if (academyId == null) {
      return;
    }
    (async () => {
      await loadRuns(academyId);
    })();
  }, [academyId, loadRuns]);

  const columns: RosterColumn<RunLiveItemResponseTypes>[] = [
    { key: "busNo", label: "버스" },
    { key: "direction", label: "구간", render: (row) => (row.direction === "to_academy" ? "등원" : "하원") },
    { key: "departTime", label: "예정 출발", render: (row) => formatDateTime(row.departTime) },
    { key: "estDepartTime", label: "확정 예정", render: (row) => formatDateTime(row.estDepartTime) },
    {
      // W4 — 확정이 계속 실패하는 회차를 이 목록에서 바로 알아본다(`API_SPEC §6.8`
      // `consecutive_failures`, BR-047 · `UF-O-07`). 0(성공)이면 표시하지 않는다.
      key: "consecutiveFailures",
      label: "",
      render: (row) => (row.consecutiveFailures > 0 ? <Badge tone="red">확정 {row.consecutiveFailures}회 연속 실패</Badge> : null),
    },
    {
      key: "action",
      label: "",
      render: (row) => (
        <Button variant="danger" onClick={() => setTarget(row)}>
          강제 확정
        </Button>
      ),
    },
  ];

  return (
    <StyledForceConfirmLayout>
      <PageHeader title="회차 강제 확정" description="확정이 지연된 대기 상태 회차를 골라 강제 확정합니다" />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <StyledFilterRow>
        <Select
          label="학원"
          value={academyId ?? ""}
          onChange={(event) => setAcademyId(event.target.value)}
          options={academies.map((academy) => ({ value: String(academy.id), label: `${academy.name} (${academy.region})` }))}
          disabled={loadingAcademies || academies.length === 0}
        />
      </StyledFilterRow>

      <Card padding={0} aria-busy={loadingRuns}>
        {!loadingRuns && runs.length === 0 ? (
          <EmptyState icon="clock" title="대기(idle) 상태인 회차가 없습니다" />
        ) : (
          <RosterTable columns={columns} loading={loadingRuns} rows={runs} getRowKey={(row) => row.runId} />
        )}
      </Card>

      {target ? (
        <ForceConfirmDialog
          run={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            if (academyId != null) {
              loadRuns(academyId);
            }
          }}
        />
      ) : null}
    </StyledForceConfirmLayout>
  );
};
