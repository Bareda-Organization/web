"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { AlertBanner, Button, Card, EmptyState, PageHeader, RosterTable, SegmentedControl, StatusChip } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getAcademyRunsLive, getAllAcademies, getRunAttention } from "../api";
import { untilText } from "../lib/relativeTime";
import type { AcademySummaryResponseTypes, RunAttentionItemTypes, RunLiveItemResponseTypes } from "../types";
import { ForceConfirmDialog } from "./ForceConfirmDialog";
import { StyledBandSlot, StyledBusCell, StyledChipRow, StyledForceConfirmLayout, StyledTwoLine } from "./ForceConfirmPage.styled";

const DUE_GROUP = "강제 확정 대상";
const WAITING_GROUP = "확정 예정 전 대기 회차";

// 확정 예정(confirm_at)이 지났는지는 화면이 지금 시각으로 판정한다(Ruling 393 — confirm_at 은 서버 저장값이라 클라이언트가 다시 빼지 않는다).
// 서버의 최종 판정은 409 RUN_NOT_DUE 다.
const isDue = (run: RunLiveItemResponseTypes, nowMs: number): boolean => new Date(run.confirmAt).getTime() <= nowMs;

const directionText = (run: RunLiveItemResponseTypes) => (run.direction === "to_academy" ? "등원" : "하원");

// §6.14 회차 강제 확정(UF-O-07 — 기능 ID 는 없다, `FEATURE_SPEC §6.2`). 확정이 계속 실패한 회차를 골라내는 화면이라 idle 상태 회차만 대상으로 둔다.
// R48 시안: 학원 칩(확정 실패 수 · 비활성 표시) · 대상 / 대기 두 묶음 · 확정 예정 전에는 꺼진 단추 "HH:mm 부터 가능"(U-03).
export const ForceConfirmPage = () => {
  const [academies, setAcademies] = useState<AcademySummaryResponseTypes[]>([]);
  const [attention, setAttention] = useState<RunAttentionItemTypes[]>([]);
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunLiveItemResponseTypes[]>([]);
  const [target, setTarget] = useState<RunLiveItemResponseTypes | null>(null);
  const [loadingAcademies, setLoadingAcademies] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(false);
  // 회차를 한 번이라도 읽어 낸 학원 — 읽기 전에는 빈 상태를 보이지 않는다(학원 목록 → 회차 목록 사이에 빈 화면이 깜빡이지 않게).
  const [loadedAcademyId, setLoadedAcademyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "지금" — 30초마다 갱신해 확정 예정 시각이 지나는 순간 단추가 켜진다.
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 학원 선택 목록은 첫 쪽(20건)이 아니라 전부 — 21번째 이후 학원의 회차도 관제·강제 확정을 할 수 있어야 한다.
        const items = await getAllAcademies();
        if (!cancelled) {
          setAcademies(items);
          // 목록은 최근 등록 순이라 첫 항목이 회차 없는 비활성 학원일 수 있다 — 첫 운영 중 학원부터 보인다(전체 관제와 같은 규칙).
          const initial = items.find((item) => item.status === "active") ?? items[0];
          if (initial) {
            setAcademyId(initial.id);
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
      // 학원 칩의 "실패 N" — 못 받아도 화면은 계속 쓴다.
      try {
        const data = await getRunAttention();
        if (!cancelled) setAttention(data.items);
      } catch {
        if (!cancelled) setAttention([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // F03-09 — 학원을 바꾼 뒤 옛 학원의 늦은 응답이 목록을 덮으면 다른 학원 회차에 "강제 확정" 을 누를 수 있다.
  // 요청이 겹치면 마지막에 보낸 요청의 응답만 반영한다.
  const runsRequestRef = useRef(0);
  const loadRuns = useCallback(async (id: string) => {
    const requestId = ++runsRequestRef.current;
    setLoadingRuns(true);
    // 학원이 바뀐 직후 옛 학원의 대기 회차가 남아 있지 않게 먼저 비운다.
    setRuns([]);
    try {
      const data = await getAcademyRunsLive(id);
      if (requestId !== runsRequestRef.current) return;
      setRuns(data.runs.filter((run) => run.runStatus === "idle"));
      setLoadedAcademyId(id);
      setError(null);
    } catch (cause) {
      if (requestId !== runsRequestRef.current) return;
      setError(cause instanceof ApiError ? cause.message : "회차 목록을 불러오지 못했습니다");
    } finally {
      if (requestId === runsRequestRef.current) setLoadingRuns(false);
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

  const academy = academies.find((item) => item.id === academyId);
  const sorted = [...runs].sort((a, b) => new Date(a.confirmAt).getTime() - new Date(b.confirmAt).getTime());
  const dueRuns = sorted.filter((run) => isDue(run, nowMs));
  // 강제 확정 대상 안에서는 실패가 많은 회차가 맨 위에 온다.
  const ordered = [...dueRuns.sort((a, b) => b.consecutiveFailures - a.consecutiveFailures), ...sorted.filter((run) => !isDue(run, nowMs))];
  const worst = dueRuns.find((run) => run.consecutiveFailures > 0);
  const failingCount = dueRuns.filter((run) => run.consecutiveFailures > 0).length;

  const chipOptions = academies.map((item) => {
    const failed = attention.find((entry) => entry.academyId === item.id)?.confirmFailedRuns ?? 0;
    const suffix = [failed > 0 ? `실패 ${failed}` : null, item.status === "inactive" ? "비활성" : null].filter(Boolean).join(" · ");
    return { value: item.id, label: suffix ? `${item.name} · ${suffix}` : item.name };
  });

  const columns: RosterColumn<RunLiveItemResponseTypes>[] = [
    {
      key: "busNo",
      label: "호차 · 방향",
      render: (row) => (
        <StyledBusCell>
          <b>{row.busNo}</b>
          <small>{directionText(row)}</small>
        </StyledBusCell>
      ),
    },
    { key: "departTime", label: "출발 시각", render: (row) => formatClockTime(row.departTime) },
    // 확정 예정은 §6.8 confirm_at(출발 30분 전) — 출발 예정(추정)과 다른 값이다(Ruling 393).
    {
      key: "confirmAt",
      label: "확정 예정",
      render: (row) => (
        <StyledTwoLine>
          <span>{formatClockTime(row.confirmAt)}</span>
          <small>{untilText(row.confirmAt, new Date(nowMs))}</small>
        </StyledTwoLine>
      ),
    },
    {
      // W4 — 확정이 계속 실패하는 회차를 이 목록에서 바로 알아본다(`API_SPEC §6.8` `consecutive_failures`, BR-047 · `UF-O-07`). 0(성공)이면 "시도 전".
      key: "consecutiveFailures",
      label: "확정 시도",
      render: (row) =>
        row.consecutiveFailures > 0 ? <StatusChip tone="bad">확정 {row.consecutiveFailures}회 연속 실패</StatusChip> : <span style={{ color: "var(--text-secondary)" }}>{isDue(row, nowMs) ? "시도 중" : "시도 전"}</span>,
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) =>
        isDue(row, nowMs) ? (
          <Button variant="dangerQuiet" size="sm" aria-label={`${row.busNo} 강제 확정`} onClick={() => setTarget(row)}>
            강제 확정
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled aria-label={`${row.busNo} 강제 확정 — ${formatClockTime(row.confirmAt)} 부터 가능`}>
            {formatClockTime(row.confirmAt)} 부터 가능
          </Button>
        ),
    },
  ];

  return (
    <StyledForceConfirmLayout>
      <PageHeader style={{ marginBottom: 20 }} title="회차 강제 확정" description="확정이 계속 실패하는 회차를 직선거리 계산으로 확정합니다 · 사유 입력 필수 · 되돌릴 수 없음" />

      {error ? (
        <StyledBandSlot>
          <AlertBanner tone="missed" title={error} />
        </StyledBandSlot>
      ) : null}

      {worst ? (
        <StyledBandSlot>
          <AlertBanner tone="missed" title={`확정이 ${worst.consecutiveFailures}회 연속 실패한 회차 ${failingCount}건 — ${academy ? `${academy.name} ` : ""}${worst.busNo} ${directionText(worst)}`}>
            확정 예정 {formatClockTime(worst.confirmAt)}이 {untilText(worst.confirmAt, new Date(nowMs))}했습니다. 출발 {formatClockTime(worst.departTime)} 전에 확정되지 않으면 기사가 노선을 받지 못합니다.
          </AlertBanner>
        </StyledBandSlot>
      ) : null}

      <StyledBandSlot>
        <AlertBanner tone="info" title="대상은 ‘확정 예정 시각이 지났는데 아직 확정되지 않은(운행 전) 회차’입니다">
          확정 예정 시각 전에는 버튼이 꺼집니다. 직선거리로 계산해 바로 확정하며 되돌릴 수 없고, 관계자 · 기사 · 동승자에게 통지가 나갑니다.
        </AlertBanner>
      </StyledBandSlot>

      <StyledChipRow>
        <span>학원</span>
        <SegmentedControl options={chipOptions} value={academyId ?? ""} onChange={setAcademyId} aria-label="학원" />
      </StyledChipRow>

      {!loadingRuns && !loadingAcademies && loadedAcademyId === academyId && runs.length === 0 ? (
        <Card padding={0}>
          <EmptyState icon="clock" title="대기(idle) 상태인 회차가 없습니다">
            확정 예정 시각이 지나도 확정되지 않은 회차가 생기면 여기에 나타납니다.
          </EmptyState>
        </Card>
      ) : (
        <RosterTable
          columns={columns}
          loading={loadingRuns}
          rows={ordered}
          getRowKey={(row) => row.runId}
          groupBy={(row) => (isDue(row, nowMs) ? DUE_GROUP : WAITING_GROUP)}
          rowTone={(row) => (isDue(row, nowMs) && row.consecutiveFailures > 0 ? "bad" : undefined)}
          aria-busy={loadingRuns}
        />
      )}

      {target ? (
        <ForceConfirmDialog
          run={target}
          academyName={academy?.name}
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
