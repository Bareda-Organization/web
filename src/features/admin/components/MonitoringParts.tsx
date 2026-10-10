import { formatClockTime } from "@/shared/lib/format/clockTime";
import { Button, EmptyState, RunStatusChip, StatStrip, StatusChip, Timeline } from "@/shared/ui";
import type { StatStripItem, TimelineEntry } from "@/shared/ui";
import { LinkButton } from "@/shared/ui/display";
import type { AcademySummaryResponseTypes, RunAttentionTodayItemTypes, RunLiveItemResponseTypes, RunStatus } from "../types";
import { barGeometry, nowPercent, runStatusNote, sortAcademiesByAttention } from "../lib/monitoringView";
import type { Axis, TodaySummary } from "../lib/monitoringView";
import { academyDotColor, untilText } from "../lib/relativeTime";
import {
  StyledDetailCard,
  StyledDetailChips,
  StyledDetailRow,
  StyledDot,
  StyledNowLine,
  StyledRailCard,
  StyledRailChips,
  StyledRailItem,
  StyledRailList,
  StyledStatusCell,
  StyledStopsHeading,
  StyledTimetableBar,
  StyledTimetableCell,
} from "./MonitoringPage.styled";

const BAR_COLOR: Record<RunStatus, string> = { idle: "var(--c-wait)", confirmed: "var(--c-conf)", moving: "var(--c-move)", finished: "var(--c-end)" };
const STATUS_ORDER: { key: RunStatus; label: string }[] = [
  { key: "moving", label: "운행 중" },
  { key: "confirmed", label: "확정" },
  { key: "finished", label: "종료" },
  { key: "idle", label: "운행 전" },
];

export const directionText = (direction: RunLiveItemResponseTypes["direction"]) => (direction === "to_academy" ? "등원" : "하원");

// ── 지표 5칸 ──────────────────────────────────────────────────────────────
const StatusBar = ({ counts }: { counts: Record<RunStatus, number> }) => {
  const total = STATUS_ORDER.reduce((sum, item) => sum + counts[item.key], 0);
  if (total === 0) return null;
  return (
    <div role="img" aria-label={STATUS_ORDER.map((item) => `${item.label} ${counts[item.key]}`).join(" · ")} style={{ display: "flex", gap: 2, height: 8, marginTop: 10 }}>
      {STATUS_ORDER.filter((item) => counts[item.key] > 0).map((item) => (
        <i key={item.key} style={{ flex: counts[item.key], background: BAR_COLOR[item.key], borderRadius: 4, display: "block" }} />
      ))}
    </div>
  );
};

export const TodayStrip = ({ summary }: { summary: TodaySummary }) => {
  const items: StatStripItem[] = [
    {
      label: "오늘 회차",
      value: summary.total,
      unit: "회",
      detail: (
        <>
          {summary.perAcademy.total || "오늘 회차 없음"}
          <StatusBar counts={summary.byStatus} />
        </>
      ),
    },
    { label: "운행 중", value: summary.moving, unit: "대", detail: summary.perAcademy.moving || "운행 중인 차량 없음" },
    { label: "지연", value: summary.delayed, unit: "건", tone: summary.delayed > 0 ? "warn" : "neutral", detail: summary.perAcademy.delayed || "지연 없음" },
    { label: "확정 실패", value: summary.confirmFailed, unit: "건", tone: summary.confirmFailed > 0 ? "bad" : "neutral", detail: summary.perAcademy.confirmFailed || "강제 확정 대상 없음" },
    { label: "미확인 비상", value: summary.openEmergencies, unit: "건", tone: summary.openEmergencies > 0 ? "bad" : "neutral", detail: summary.perAcademy.emergencies || "이상 없음" },
  ];
  return <StatStrip items={items} />;
};

// ── 학원 레일 ─────────────────────────────────────────────────────────────
export const AcademyRail = ({
  academies,
  today,
  openEmergencyCounts,
  selectedId,
  onSelect,
}: {
  academies: AcademySummaryResponseTypes[];
  today: RunAttentionTodayItemTypes[];
  openEmergencyCounts: Record<string, number>;
  selectedId: string | null;
  onSelect: (academyId: string) => void;
}) => {
  const rowOf = (academyId: string) => today.find((item) => item.academyId === academyId);
  const sorted = sortAcademiesByAttention(academies, today, openEmergencyCounts);

  return (
    <StyledRailCard aria-labelledby="monitoring-rail-title">
      <h3 id="monitoring-rail-title">
        학원 {academies.length}곳<small>문제 있는 곳 먼저</small>
      </h3>
      <StyledRailList>
        {sorted.map((academy) => {
          const row = rowOf(academy.id);
          const emergency = openEmergencyCounts[academy.id] ?? 0;
          const parts = row ? STATUS_ORDER.filter((item) => row.byStatus[item.key] > 0).map((item) => `${item.label} ${row.byStatus[item.key]}`) : [];
          const line =
            row && row.runCount > 0
              ? `오늘 ${row.runCount}회 · ${parts.join(" · ")}`
              : academy.status === "inactive"
                ? "비활성 · 오늘 회차 없음"
                : "오늘 회차 없음";
          return (
            <StyledRailItem key={academy.id} type="button" $active={academy.id === selectedId} aria-pressed={academy.id === selectedId} onClick={() => onSelect(academy.id)}>
              <b>
                <StyledDot $color={academy.status === "inactive" ? "var(--c-end)" : academyDotColor(academy.name)} aria-hidden="true" />
                {academy.name}
              </b>
              <span>{line}</span>
              {emergency > 0 || (row?.confirmFailedRuns ?? 0) > 0 || (row?.delayedRuns ?? 0) > 0 ? (
                <StyledRailChips>
                  {emergency > 0 ? <StatusChip tone="bad">{`비상 ${emergency}건`}</StatusChip> : null}
                  {(row?.confirmFailedRuns ?? 0) > 0 ? <StatusChip tone="bad" marker={false}>{`확정 실패 ${row?.confirmFailedRuns}건`}</StatusChip> : null}
                  {(row?.delayedRuns ?? 0) > 0 ? <StatusChip tone="warn" marker={false}>{`지연 ${row?.delayedRuns}`}</StatusChip> : null}
                </StyledRailChips>
              ) : null}
            </StyledRailItem>
          );
        })}
      </StyledRailList>
    </StyledRailCard>
  );
};

// ── 선택 회차 칸 ──────────────────────────────────────────────────────────
const stopEntries = (run: RunLiveItemResponseTypes, nowMs: number): TimelineEntry[] =>
  [...run.stops]
    .sort((a, b) => a.seq - b.seq)
    .map((stop) => {
      if (stop.change === "skipped") return { tone: "end", title: stop.name, meta: "오늘 서지 않음" } as TimelineEntry;
      if (stop.arrivedAt) return { tone: "ok", title: stop.name, meta: `도착 ${formatClockTime(stop.arrivedAt)}` } as TimelineEntry;
      const late = stop.eta !== null && new Date(stop.eta).getTime() < nowMs;
      return {
        tone: "end",
        title: stop.name,
        meta: stop.eta ? `예정 ${formatClockTime(stop.eta)}${late ? ` · 예정 시각 ${untilText(stop.eta, new Date(nowMs)).replace(" 지남", "")} 경과` : ""}` : "예정 –",
      } as TimelineEntry;
    });

const ContactRow = ({ label, contact, missing }: { label: string; contact: RunLiveItemResponseTypes["driver"]; missing: string }) => (
  <StyledDetailRow>
    <span>{label}</span>
    <b>{contact ? contact.name : missing}</b>
    {contact?.phone ? (
      <LinkButton href={`tel:${contact.phone}`} aria-label={`${contact.name} ${label} 전화`}>
        전화
      </LinkButton>
    ) : (
      <span />
    )}
  </StyledDetailRow>
);

export const RunDetailPanel = ({ run, academyName, nowMs, onRoster }: { run: RunLiveItemResponseTypes | null; academyName?: string; nowMs: number; onRoster: (run: RunLiveItemResponseTypes) => void }) => {
  if (!run) {
    return (
      <StyledDetailCard aria-label="선택한 회차">
        <EmptyState icon="bus" title="회차를 골라 보세요" slim>
          표나 지도에서 회차를 고르면 기사 · 동승자 · 승하차지가 여기 보입니다.
        </EmptyState>
      </StyledDetailCard>
    );
  }
  const stops = stopEntries(run, nowMs);
  return (
    <StyledDetailCard aria-label="선택한 회차">
      <h3>
        {run.busNo} · {directionText(run.direction)}
      </h3>
      <StyledDetailChips>
        <RunStatusChip status={run.runStatus} />
        {(run.delayMinutes ?? 0) > 0 ? <StatusChip tone="warn" marker={false}>{`${run.delayMinutes}분 지연`}</StatusChip> : null}
      </StyledDetailChips>
      <div>
        <ContactRow label="기사" contact={run.driver} missing="미배치" />
        <ContactRow label="동승자" contact={run.escort} missing="미배치" />
        <StyledDetailRow>
          <span>출발</span>
          <span>
            <b>{formatClockTime(run.departTime)}</b>
            {run.estDepartTime ? <small>운행 시작 {formatClockTime(run.estDepartTime)}</small> : null}
          </span>
          <span />
        </StyledDetailRow>
        <StyledDetailRow>
          <span>{run.runStatus === "finished" ? "종료" : "도착 예정"}</span>
          <span>
            <b>{run.runStatus === "finished" && run.finishedAt ? formatClockTime(run.finishedAt) : run.destinationEta ? formatClockTime(run.destinationEta) : "–"}</b>
            {academyName && run.destinationEta && run.runStatus !== "finished" ? <small>{academyName} 계획값</small> : null}
          </span>
          <span />
        </StyledDetailRow>
      </div>
      {stops.length > 0 ? (
        <>
          <StyledStopsHeading>승하차지 {stops.length}곳 · 도착 예정은 계획값(운행 중 재계산 없음)</StyledStopsHeading>
          <Timeline items={stops} aria-label="승하차지 도착" />
        </>
      ) : (
        <StyledStopsHeading>승하차지 정보가 아직 없습니다 — 노선이 확정되면 여기에 보입니다</StyledStopsHeading>
      )}
      <Button variant="secondary" icon="users" onClick={() => onRoster(run)}>
        탑승 명단 보기
      </Button>
    </StyledDetailCard>
  );
};

// ── 시간표 막대 ───────────────────────────────────────────────────────────
export const TimetableCell = ({ run, axis, nowMs }: { run: RunLiveItemResponseTypes; axis: Axis; nowMs: number }) => {
  const bar = barGeometry(run, axis);
  const now = nowPercent(nowMs, axis);
  return (
    <StyledTimetableCell role="img" aria-label={`${run.busNo} ${directionText(run.direction)} ${formatClockTime(run.departTime)} 출발${bar.estimated ? " · 도착 예정 없음(기본 길이)" : ""}`}>
      <StyledTimetableBar $color={BAR_COLOR[run.runStatus]} $estimated={bar.estimated} style={{ left: `${Math.max(0, bar.left)}%`, width: `${Math.min(bar.width, 100 - Math.max(0, bar.left))}%` }} />
      {now !== null ? <StyledNowLine style={{ left: `${now}%` }} /> : null}
    </StyledTimetableCell>
  );
};

// 표의 상태 칸 — 칩 + (지연 칩) + 아래 한 줄
export const StatusCell = ({ run, nowMs }: { run: RunLiveItemResponseTypes; nowMs: number }) => {
  const note = runStatusNote(run, nowMs);
  return (
    <StyledStatusCell>
      <div>
        <RunStatusChip status={run.runStatus} />
        {(run.delayMinutes ?? 0) > 0 ? <StatusChip tone="warn" marker={false}>{`${run.delayMinutes}분 지연`}</StatusChip> : null}
        {run.consecutiveFailures > 0 && run.runStatus === "idle" ? <StatusChip tone="bad" marker={false}>{`확정 ${run.consecutiveFailures}회 연속 실패`}</StatusChip> : null}
      </div>
      {note ? <small>{note}</small> : null}
    </StyledStatusCell>
  );
};
