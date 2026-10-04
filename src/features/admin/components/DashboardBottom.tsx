import { Card, EmptyState, Feed, RunStatusChip, StatusChip } from "@/shared/ui";
import type { FeedItem } from "@/shared/ui";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { academyStatusCounts, directionLabel, eventSentence, eventTime, onTimeText, runProgress } from "../lib/dashboardView";
import type { DashboardDays, DashboardHealthKey, DashboardResponseTypes, DashboardTodayRunResponseTypes } from "../types/dashboard";
import {
  StyledAcademyDot,
  StyledCardBody,
  StyledCardHeading,
  StyledFaint,
  StyledFill,
  StyledHBar,
  StyledHealthRow,
  StyledStatusBar,
  StyledStatusBarRow,
  StyledSubHeading,
  StyledTable,
  StyledTableWrap,
  StyledTrack,
  StyledWarnText,
} from "./DashboardPage.styled";

export type AcademySlot = (academyId: string) => 0 | 1;

// 학원 구분 색(시안의 두 색)은 학원 이름순 위치로 번갈아 준다 — 같은 학원은 표 · 막대 · 지표에서 늘 같은 색이다.
export const makeAcademySlot = (academies: DashboardResponseTypes["academies"], runs: DashboardTodayRunResponseTypes[]): AcademySlot => {
  const order = [...academies.map((academy) => academy.academyId), ...runs.map((run) => run.academyId)];
  const unique = [...new Set(order)];
  return (academyId) => (unique.indexOf(academyId) % 2 === 0 ? 0 : 1);
};

const RUN_FILL: Record<string, string> = { finished: "var(--c-end)", moving: "var(--c-move)" };

const runMemo = (run: DashboardTodayRunResponseTypes) => {
  const memos: { text: string; warn: boolean }[] = [];
  if (run.delayMinutes !== null && run.delayMinutes > 0) memos.push({ text: `${run.delayMinutes}분 지연`, warn: true });
  else if (run.runStatus === "moving" && run.stopsTotal !== null) memos.push({ text: `승하차지 ${run.stopsDone ?? 0}/${run.stopsTotal}`, warn: false });
  if (run.pendingChangeCount > 0) memos.push({ text: `승인 대기 ${run.pendingChangeCount}`, warn: true });
  if (!run.driverAssigned && run.runStatus !== "finished") memos.push({ text: "기사 미배치", warn: true });
  return memos;
};

const ProgressCell = ({ run, nowMs }: { run: DashboardTodayRunResponseTypes; nowMs: number }) => {
  const progress = runProgress(run, nowMs);
  if (progress.kind === "before") return <StyledFaint as="span">출발 전</StyledFaint>;
  if (progress.kind === "unknown") return <StyledFaint as="span">—</StyledFaint>;
  return (
    <StyledHBar $slim>
      <StyledTrack>
        <StyledFill $color={RUN_FILL[run.runStatus] ?? "var(--c-conf)"} $width={progress.value} />
      </StyledTrack>
      <span>{progress.value}%</span>
    </StyledHBar>
  );
};

const STATUS_SEGMENTS = [
  { key: "finished", label: "종료", color: "var(--c-end)" },
  { key: "moving", label: "운행 중", color: "var(--c-move)" },
  { key: "confirmed", label: "확정", color: "var(--c-conf)" },
  { key: "idle", label: "운행 전", color: "var(--c-wait)" },
] as const;

export const TodayRunsCard = ({ data, slotOf }: { data: DashboardResponseTypes; slotOf: AcademySlot }) => {
  const runs = data.todayRuns;
  const nowMs = new Date(data.asOf).getTime();
  const counts = academyStatusCounts(runs);
  const rows = [...counts.byAcademy, counts.all];

  return (
    <Card padding={0}>
      <StyledCardBody aria-labelledby="dashboard-runs-title">
        <StyledCardHeading id="dashboard-runs-title">
          회차 {runs.length} <small>출발 순 · 진행률 = (지금 − 출발) / (도착 − 출발)</small>
        </StyledCardHeading>
        {runs.length === 0 ? (
          <EmptyState icon="bus" title="오늘 운행하는 회차가 없습니다">
            취소되지 않은 오늘 회차가 생기면 여기에 출발 순으로 보입니다.
          </EmptyState>
        ) : (
          <>
            <StyledTableWrap>
              <StyledTable>
                <thead>
                  <tr>
                    <th>출발</th>
                    <th>학원</th>
                    <th>차량 · 방향</th>
                    <th>상태</th>
                    <th>진행</th>
                    <th>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.runId}>
                      <td>
                        <b>{formatClockTime(run.departTime)}</b>
                      </td>
                      <td>
                        <StyledAcademyDot $slot={slotOf(run.academyId)} aria-hidden="true" />
                        {run.academyName}
                      </td>
                      <td>
                        {run.busNo} · {directionLabel(run.direction)}
                      </td>
                      <td>
                        <RunStatusChip status={run.runStatus} />
                      </td>
                      <td style={{ width: 150 }}>
                        <ProgressCell run={run} nowMs={nowMs} />
                      </td>
                      <td>
                        {runMemo(run).map((memo, index) => (
                          <span key={memo.text}>
                            {index > 0 ? " · " : null}
                            {memo.warn ? <StyledWarnText>{memo.text}</StyledWarnText> : memo.text}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>
            </StyledTableWrap>
            <StyledSubHeading>상태별 · 학원별</StyledSubHeading>
            {rows.map((row) => (
              <StyledStatusBarRow key={row.academyId}>
                <span>
                  {row.academyId === "all" ? null : <StyledAcademyDot $slot={slotOf(row.academyId)} aria-hidden="true" />}
                  {row.academyName} <b>{row.total}회</b>
                </span>
                <StyledStatusBar role="img" aria-label={STATUS_SEGMENTS.map((segment) => `${segment.label} ${row.counts[segment.key]}`).join(" · ")}>
                  {STATUS_SEGMENTS.filter((segment) => row.counts[segment.key] > 0).map((segment) => (
                    <i key={segment.key} style={{ flex: row.counts[segment.key], background: segment.color }} title={`${segment.label} ${row.counts[segment.key]}`} />
                  ))}
                </StyledStatusBar>
                <span>
                  {STATUS_SEGMENTS.filter((segment) => row.counts[segment.key] > 0)
                    .map((segment) => `${segment.label} ${row.counts[segment.key]}`)
                    .join(" · ")}
                </span>
              </StyledStatusBarRow>
            ))}
          </>
        )}
      </StyledCardBody>
    </Card>
  );
};

const HEALTH_LABEL: Record<DashboardHealthKey, string> = {
  api: "API 응답",
  position: "버스 위치 수신",
  confirm_batch: "확정 배치",
  notification: "알림 발송",
};

const HEALTH_TONE = { ok: "ok", warn: "warn", down: "bad" } as const;

const PERIOD_TITLE: Record<DashboardDays, string> = { 1: "오늘 지표", 7: "주간 지표", 30: "30일 지표" };

export const MetricsCard = ({ data, days, slotOf }: { data: DashboardResponseTypes; days: DashboardDays; slotOf: AcademySlot }) => (
  <Card padding={0}>
    <StyledCardBody aria-labelledby="dashboard-metrics-title">
      <StyledCardHeading id="dashboard-metrics-title">{PERIOD_TITLE[days]}</StyledCardHeading>
      <StyledTableWrap>
        <StyledTable>
          <thead>
            <tr>
              <th>학원</th>
              <th className="num">운행</th>
              <th className="num">정시율</th>
              <th className="num">지연</th>
              <th className="num">비상</th>
              <th className="num">변경</th>
            </tr>
          </thead>
          <tbody>
            {data.academies.map((academy) => (
              <tr key={academy.academyId}>
                <td>
                  <StyledAcademyDot $slot={slotOf(academy.academyId)} aria-hidden="true" />
                  {academy.academyName}
                </td>
                <td className="num">{academy.runCount}</td>
                <td className="num">{academy.onTimeRate === null ? "—" : `${onTimeText(academy.onTimeRate)}%`}</td>
                <td className="num">{academy.delayCount > 0 ? <StyledWarnText>{academy.delayCount}</StyledWarnText> : academy.delayCount}</td>
                <td className="num">{academy.emergencyCount}</td>
                <td className="num">{academy.changeRequestCount}</td>
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </StyledTableWrap>
      <StyledHealthRow aria-label="시스템 상태">
        {data.health.map((item) => (
          <StatusChip key={item.key} tone={HEALTH_TONE[item.status]}>
            {HEALTH_LABEL[item.key]}
            {item.detail ? ` · ${item.detail}` : null}
          </StatusChip>
        ))}
      </StyledHealthRow>
    </StyledCardBody>
  </Card>
);

export const RecentEventsCard = ({ data }: { data: DashboardResponseTypes }) => {
  const now = new Date(data.asOf);
  const items: FeedItem[] = data.recentEvents.map((event) => ({ time: eventTime(event.at, now), text: eventSentence(event) }));
  return (
    <Card padding={0}>
      <StyledCardBody aria-labelledby="dashboard-events-title">
        <StyledCardHeading id="dashboard-events-title">최근 기록</StyledCardHeading>
        {items.length === 0 ? <StyledFaint>최근 7일 안에 운영 기록이 없습니다.</StyledFaint> : <Feed items={items} />}
      </StyledCardBody>
    </Card>
  );
};
