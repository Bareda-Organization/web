"use client";

import Link from "next/link";
import { useState } from "react";
import { usePagedList, useRealtimeConnection } from "@/shared/hooks";
import { AlertBanner, Button, Card, EmptyState, PageHeader, RosterTable, StatusChip, Tabs } from "@/shared/ui";
import { LinkButton } from "@/shared/ui/display";
import type { RosterColumn } from "@/shared/types";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { formatRole } from "@/shared/lib/format/roleLabel";
import { RECENT_LIST_CAP } from "@/shared/lib/format/listCap";
import { getEmergencies } from "../api";
import { emergencyTypeLabel } from "../lib/emergencyType";
import { academyDotColor, eventTimeCell } from "../lib/relativeTime";
import type { EmergencyItemResponseTypes } from "../types";
import { EmergencyDetailPanel, raisedClock } from "./EmergencyDetailPanel";
import {
  StyledAcademyDot,
  StyledAcademyLine,
  StyledBandActions,
  StyledBandSlot,
  StyledElapsed,
  StyledEmergencyGrid,
  StyledEmergencyLeft,
  StyledEmergencyAlertsLayout,
  StyledFootNote,
  StyledStamp,
  StyledStampDot,
  StyledStepsCard,
  StyledTwoLine,
} from "./EmergencyAlertsPage.styled";

type StatusTab = "open" | "acked" | "canceled";

// 발신 후 경과 초 → "N분" (1분 미만은 그대로 알린다).
const formatElapsed = (seconds: number): string => (seconds < 60 ? "1분 미만" : `${Math.floor(seconds / 60)}분`);

// 비상 알림은 지연 인지 자체가 위험이라(§6.11) 다른 화면보다 짧은 5초로 폴링한다.
const EMERGENCY_POLL_INTERVAL_MS = 5000;

const directionText = (direction: EmergencyItemResponseTypes["direction"]) => (direction === "to_academy" ? "등원" : "하원");

// 세 상태를 한 번에 읽는다 — 탭 건수가 서로의 건수를 알아야 해서다(§6.11 은 상태 하나씩만 준다). 고른 탭의 목록만 화면에 쓴다.
const fetchTab = async (tab: StatusTab) => {
  const [open, acked, canceled] = await Promise.all([getEmergencies("open"), getEmergencies("acked"), getEmergencies("canceled")]);
  const current = tab === "open" ? open : tab === "acked" ? acked : canceled;
  return {
    items: current.items,
    unackedCount: open.unackedCount,
    counts: { open: open.items.length, acked: acked.items.length, canceled: canceled.items.length },
    totalCount: current.items.length,
    hasNext: false,
  };
};

// §6.11 비상 알림(O-07). 메인 관리자는 전 학원 알림을 한 화면에서 보므로 목록에 학원명 열을 둔다(BRIEF-a1.md §2).
// R48 시안: 상태 탭 건수 · 미확인 띠(몇 분째 응답 없음 + 학원에 전화) · 오른쪽 상시 칸(작은 지도 · 학원 확인 상태 · 바로 연락).
export const EmergencyAlertsPage = () => {
  const [tab, setTab] = useState<StatusTab>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { connectionState } = useRealtimeConnection();
  // 갱신이 한 번 실패해도 이미 보이던 목록은 지우지 않는다(usePagedList) — 오류 띠만 더한다.
  const { items: emergencies, data, loading, error, reload } = usePagedList(() => fetchTab(tab), {
    resetKey: tab,
    pollMs: EMERGENCY_POLL_INTERVAL_MS,
    errorMessage: "비상 알림 이력을 불러오지 못했습니다",
  });
  const counts = data?.counts;
  const unackedCount = data?.unackedCount ?? 0;
  const selected = emergencies.find((item) => item.emergencyId === selectedId) ?? emergencies[0] ?? null;
  // 응답이 가장 오래 걸린(경과가 큰) 미확인 비상 — 띠가 말하는 대상.
  const worst = tab === "open" ? [...emergencies].sort((a, b) => b.elapsedSinceRaised - a.elapsedSinceRaised)[0] : undefined;
  const connected = connectionState === "connected";

  const columns: RosterColumn<EmergencyItemResponseTypes>[] =
    tab === "open"
      ? [
          {
            key: "elapsed",
            label: "경과",
            render: (row) => (
              <StyledElapsed $urgent>
                <b>{formatElapsed(row.elapsedSinceRaised)}</b>
                <small>{raisedClock(row.raisedAt)}</small>
              </StyledElapsed>
            ),
          },
        ]
      : [
          {
            key: "raisedAt",
            label: "발신 시각",
            render: (row) => {
              const cell = eventTimeCell(row.raisedAt);
              const respond = row.ackedAt ? `응답 ${formatElapsed((Date.parse(row.ackedAt) - Date.parse(row.raisedAt)) / 1000)}` : row.canceledAt ? "취소됨" : cell.sub;
              return (
                <StyledTwoLine>
                  <span>{tab === "acked" ? `${cell.main.replace("오늘 ", "")}` : cell.main}</span>
                  <small>{respond}</small>
                </StyledTwoLine>
              );
            },
          },
        ];

  const allColumns: RosterColumn<EmergencyItemResponseTypes>[] = [
    ...columns,
    {
      key: "academy",
      label: "학원 · 호차",
      render: (row) => (
        <StyledTwoLine>
          <StyledAcademyLine>
            <StyledAcademyDot $color={academyDotColor(row.academy.name)} aria-hidden="true" />
            <b>{row.academy.name}</b>
          </StyledAcademyLine>
          <small>
            {row.busNo} · {directionText(row.direction)}
          </small>
        </StyledTwoLine>
      ),
    },
    { key: "type", label: "유형", render: (row) => <StatusChip tone="bad">{emergencyTypeLabel(row.type)}</StatusChip> },
    {
      key: "raisedBy",
      label: "발신자",
      render: (row) => (
        <StyledTwoLine>
          <span>{row.raisedBy.name ?? "미상"}</span>
          <small>{formatRole(row.raisedBy.role)}</small>
        </StyledTwoLine>
      ),
    },
    {
      key: "staffAcked",
      label: "학원 확인",
      render: (row) =>
        row.canceledAt ? (
          <StatusChip tone="end">취소됨</StatusChip>
        ) : row.staffAcked ? (
          <StyledTwoLine>
            <StatusChip tone="conf" quiet>
              확인됨
            </StatusChip>
            <small>{row.ackedBy?.name ?? ""}</small>
          </StyledTwoLine>
        ) : (
          <StatusChip tone="bad">미확인</StatusChip>
        ),
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="secondary" size="sm" aria-label={`${row.academy.name} ${row.busNo} 상세`} onClick={() => setSelectedId(row.emergencyId)}>
          상세
        </Button>
      ),
    },
  ];

  const tabs = [
    { value: "open", label: "미확인", count: counts?.open },
    { value: "acked", label: "확인됨", count: counts?.acked },
    { value: "canceled", label: "취소됨", count: counts?.canceled },
  ];

  return (
    <StyledEmergencyAlertsLayout>
      <PageHeader
        style={{ marginBottom: 20 }}
        title="비상 알림"
        description="전 학원의 비상 알림을 학원 관계자와 동시에 받습니다 · 5초마다 갱신"
        actions={
          <StyledStamp>
            <StyledStampDot $live={connected} aria-hidden="true" />
            {data ? `${formatClockTime(new Date().toISOString())} 기준 · ` : ""}
            {connected ? "실시간 연결됨" : "실시간 연결 끊김"}
          </StyledStamp>
        }
      />

      {error ? (
        <StyledBandSlot>
          <AlertBanner tone="missed" title={error} />
        </StyledBandSlot>
      ) : null}

      {!error && tab === "open" && data ? (
        <StyledBandSlot>
          {worst ? (
            <AlertBanner
              tone="missed"
              title={`미확인 비상 ${unackedCount}건 — 학원 관계자가 ${formatElapsed(worst.elapsedSinceRaised)}째 응답하지 않았습니다`}
              action={
                <StyledBandActions>
                  <LinkButton href={`tel:${worst.academy.contact}`}>학원에 전화</LinkButton>
                  <LinkButton href="/monitoring">전체 관제에서 보기</LinkButton>
                </StyledBandActions>
              }
            >
              {worst.academy.name} {worst.busNo} {directionText(worst.direction)} · {emergencyTypeLabel(worst.type)} · {formatClockTime(worst.raisedAt)} 발신
            </AlertBanner>
          ) : (
            <AlertBanner tone="boarded" title="미확인 비상이 없습니다">
              새 비상 알림이 오면 이 화면 맨 위와 전체 관제 화면에 바로 나타납니다.
            </AlertBanner>
          )}
        </StyledBandSlot>
      ) : null}

      {emergencies.length >= RECENT_LIST_CAP ? (
        <StyledBandSlot>
          <AlertBanner tone="info" title={`최근 ${RECENT_LIST_CAP}건까지만 표시합니다 — 그 이전 이력은 이 화면에서 볼 수 없습니다`} />
        </StyledBandSlot>
      ) : null}

      <Tabs items={tabs} value={tab} onChange={(value) => { setTab(value as StatusTab); setSelectedId(null); }} aria-label="비상 알림 상태" />

      {!loading && !error && emergencies.length === 0 ? (
        <Card padding={0} style={{ marginTop: 16 }}>
          <EmptyState
            icon="triangle-alert"
            title="해당 상태의 비상 알림이 없습니다"
            action={
              tab === "open" ? (
                <Button variant="secondary" size="sm" onClick={() => setTab("acked")}>
                  확인됨 보기
                </Button>
              ) : undefined
            }
          >
            지난 알림은 ‘확인됨’ · ‘취소됨’ 탭에서 볼 수 있습니다.
          </EmptyState>
        </Card>
      ) : (
        <StyledEmergencyGrid>
          <StyledEmergencyLeft>
            <Card padding={0} aria-busy={loading}>
              <RosterTable
                hasError={Boolean(error)}
                onRetry={reload}
                columns={allColumns}
                loading={loading}
                rows={emergencies}
                getRowKey={(row) => row.emergencyId}
                selectedKey={selected?.emergencyId ?? null}
                rowTone={(row) => (!row.staffAcked && !row.canceledAt ? "bad" : undefined)}
              />
            </Card>
            {tab === "open" ? (
              <StyledStepsCard aria-labelledby="emergency-steps-title">
                <h2 id="emergency-steps-title">이 화면에서 하는 일</h2>
                <ol>
                  <li>학원 관계자가 확인했는지 · 몇 분째 응답이 없는지 본다</li>
                  <li>학원 · 기사 · 동승 매니저에게 직접 연락한다</li>
                  <li>
                    <Link href="/monitoring">전체 관제</Link>에서 발신 회차 위치를 확인한다
                  </li>
                </ol>
              </StyledStepsCard>
            ) : null}
          </StyledEmergencyLeft>
          {selected ? <EmergencyDetailPanel emergency={selected} /> : null}
        </StyledEmergencyGrid>
      )}
      <StyledFootNote>접수 시각 역순으로 최근 {RECENT_LIST_CAP}건까지 표시합니다 — 그보다 오래된 이력은 이 화면에서 볼 수 없습니다.</StyledFootNote>
    </StyledEmergencyAlertsLayout>
  );
};
