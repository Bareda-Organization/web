import Link from "next/link";
import { Card, ListRow, ListRows, StatStrip, StatusChip } from "@/shared/ui";
import type { StatStripItem } from "@/shared/ui";
import { TargetBar } from "@/shared/ui/display";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { directionLabel, loginGrowthText, onTimeText, runsDeltaText } from "../lib/dashboardView";
import type { DashboardDays, DashboardResponseTypes } from "../types/dashboard";
import { DailyBarChart, DailyLineChart } from "./DashboardCharts";
import { StyledCardBody, StyledCardHeading, StyledFaint, StyledFill, StyledHBar, StyledOkTitle, StyledRowLink, StyledTrack, StyledWarnText } from "./DashboardPage.styled";

// ── 지표 6칸 ──────────────────────────────────────────────────────────────
const StackedBar = ({ data }: { data: DashboardResponseTypes["changeRequests"] }) => {
  const total = Math.max(data.total, 1);
  const parts = [
    { label: "승인", value: data.approved, color: "var(--c-conf)" },
    { label: "거절", value: data.rejected, color: "var(--c-end)" },
    { label: "자동 거절", value: data.autoRejected, color: "var(--c-move)" },
  ];
  let offset = 0;
  return (
    <svg viewBox="0 0 96 10" width="100%" height="10" preserveAspectRatio="none" role="img" aria-label={parts.map((part) => `${part.label} ${part.value}`).join(" · ")}>
      {parts.map((part) => {
        const width = (part.value / total) * 94;
        const node = width > 0 ? (
          <rect key={part.label} x={Math.round(offset * 10) / 10} y="0" width={Math.round(width * 10) / 10} height="10" rx="3" fill={part.color}>
            <title>{`${part.label} ${part.value}`}</title>
          </rect>
        ) : null;
        offset += width + 2;
        return node;
      })}
    </svg>
  );
};

const blockText = (logins: DashboardResponseTypes["logins"]): string => {
  if (logins.blocks === 0) return "차단 0건";
  if (logins.blocksReleased >= logins.blocks) return `차단 ${logins.blocks}건(해제됨)`;
  return `차단 ${logins.blocks}건(해제 ${logins.blocksReleased})`;
};

const buildStats = (data: DashboardResponseTypes, days: DashboardDays): StatStripItem[] => {
  const daily = data.daily;
  const { onTime, delays, changeRequests, logins, runs } = data;
  const peak = delays.peak ? `${Number(delays.peak.date.slice(5, 7))}/${Number(delays.peak.date.slice(8, 10))} 가장 많음(${delays.peak.count})` : "지연 없음";
  const growth = loginGrowthText(logins.todaySuccess, logins.yesterdaySuccess);
  const rateLabel = onTime.rate === null ? "정시 출발률 집계 없음" : `정시 출발률 ${onTimeText(onTime.rate)}% (목표 ${Math.round(onTime.targetRate * 100)}%)`;

  return [
    {
      label: "운행 회차",
      value: runs.count,
      unit: "회",
      detail: (
        <>
          {runsDeltaText(days, runs.count, runs.previousCount)}
          <br />
          취소 {runs.canceledCount}회
        </>
      ),
      trend: { values: daily.map((day) => day.runCount), tone: "conf", label: "운행 회차 최근 7일" },
    },
    {
      label: "정시 출발률",
      value: onTimeText(onTime.rate),
      unit: onTime.rate === null ? undefined : "%",
      tone: onTime.rate !== null && onTime.rate < onTime.targetRate ? "warn" : "neutral",
      detail: (
        <>
          목표 {Math.round(onTime.targetRate * 100)}% 이상
          <br />
          (세로선 = 목표)
          {onTime.rate === null ? null : <TargetBar value={onTime.rate} target={onTime.targetRate} tone={onTime.rate < onTime.targetRate ? "move" : "conf"} label={rateLabel} />}
        </>
      ),
    },
    {
      label: "지연",
      value: delays.count,
      unit: "건",
      detail: (
        <>
          오늘 {delays.todayCount}
          <br />
          {peak}
        </>
      ),
      trend: { values: daily.map((day) => day.delayCount), tone: "move", label: "지연 최근 7일" },
    },
    {
      label: "변경 요청 처리",
      value: changeRequests.total,
      unit: "건",
      detail: (
        <>
          승인 {changeRequests.approved} · 거절 {changeRequests.rejected}
          <br />
          자동 거절 {changeRequests.autoRejected}
          <StackedBar data={changeRequests} />
        </>
      ),
    },
    {
      label: "로그인 성공",
      value: logins.success,
      unit: "건",
      detail: (
        <>
          오늘 {logins.todaySuccess}
          <br />
          {growth ?? "어제 기록 없음"}
        </>
      ),
      trend: { values: daily.map((day) => day.loginSuccess), tone: "conf", label: "로그인 성공 최근 7일" },
    },
    {
      label: "로그인 실패",
      value: logins.fail,
      unit: "건",
      tone: logins.fail > 0 ? "bad" : "neutral",
      detail: blockText(logins),
      trend: { values: daily.map((day) => day.loginFail), tone: "bad", label: "로그인 실패 최근 7일" },
    },
  ];
};

export const DashboardStats = ({ data, days }: { data: DashboardResponseTypes; days: DashboardDays }) => <StatStrip items={buildStats(data, days)} />;

// ── 지금 처리할 것 ────────────────────────────────────────────────────────
const waitingDays = (requestedAt: string, now: Date): number => Math.max(1, Math.floor((now.getTime() - new Date(requestedAt).getTime()) / 86_400_000) + 1);

const RowLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <StyledRowLink>
    <Link href={href}>{children}</Link>
  </StyledRowLink>
);

const runLabel = (run: { academyName: string; busNo: string; direction: "to_academy" | "from_academy" }) => `${run.academyName} ${run.busNo} ${directionLabel(run.direction)}`;

const COUNT_ROWS = [
  { key: "unackedEmergencies", label: "미확인 비상 알림", href: "/emergency-alerts", tone: "bad" },
  { key: "staleRuns", label: "끝나지 않은 회차", href: "/stale-runs", tone: "warn" },
  { key: "confirmFailedRuns", label: "확정 실패 회차", href: "/force-confirm", tone: "warn" },
  { key: "blockedAccounts", label: "차단 계정", href: "/blocked-accounts", tone: "warn" },
] as const;

// 이상 없음 문구에 쓰는 이름 — 건수 행 제목과 달리 짧은 이름.
const OK_NAMES: Record<(typeof COUNT_ROWS)[number]["key"], string> = {
  unackedEmergencies: "비상 알림",
  staleRuns: "끝나지 않은 회차",
  confirmFailedRuns: "확정 실패",
  blockedAccounts: "차단 계정",
};

export const AttentionCard = ({ attention, now }: { attention: DashboardResponseTypes["attention"]; now: Date }) => {
  const blocked = attention.signupBlocked;
  const delayed = attention.delayedRuns;
  const expiring = attention.expiringChangeRequests;
  const countRows = COUNT_ROWS.filter((row) => attention[row.key] > 0);
  const okRows = COUNT_ROWS.filter((row) => attention[row.key] === 0);
  const total = blocked.length + delayed.length + expiring.length + countRows.length;
  const expiringCount = expiring.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card padding={0}>
      <StyledCardBody aria-labelledby="dashboard-attention-title">
        <StyledCardHeading id="dashboard-attention-title">
          지금 처리할 것
          {total > 0 ? <StatusChip tone="bad" marker={false}>{`${total}건`}</StatusChip> : <StatusChip tone="ok" marker={false}>없음</StatusChip>}
        </StyledCardHeading>
        <ListRows>
          {blocked.length > 0 ? (
            <ListRow
              tone="warn"
              title={
                <>
                  <RowLink href="/member-approvals">가입 승인</RowLink> <StatusChip tone="bad" marker={false}>막힘</StatusChip>
                </>
              }
              description={`${blocked[0].name} · ${blocked[0].academyName} — 정원 찼음 · ${waitingDays(blocked[0].requestedAt, now)}일째${blocked.length > 1 ? ` 외 ${blocked.length - 1}건` : ""}`}
              count={<StyledWarnText>{blocked.length}</StyledWarnText>}
            />
          ) : null}
          {delayed.length > 0 ? (
            <ListRow
              tone="warn"
              title={<RowLink href="/monitoring">운행 지연</RowLink>}
              description={`${runLabel(delayed[0])}${delayed[0].delayMinutes === null ? "" : ` · ${delayed[0].delayMinutes}분`}${delayed.length > 1 ? ` 외 ${delayed.length - 1}건` : ""}`}
              count={<StyledWarnText>{delayed.length}</StyledWarnText>}
            />
          ) : null}
          {expiring.length > 0 ? (
            <ListRow
              tone="warn"
              title={<RowLink href="/monitoring">변경 요청 · 자동 거절 임박</RowLink>}
              description={`${runLabel(expiring[0])} ${formatClockTime(expiring[0].deadlineAt)}${expiring.length > 1 ? ` 외 ${expiring.length - 1}회차` : ""}`}
              count={expiringCount}
            />
          ) : null}
          {countRows.map((row) => (
            <ListRow key={row.key} tone={row.tone} title={<RowLink href={row.href}>{row.label}</RowLink>} count={attention[row.key]} />
          ))}
          {okRows.length > 0 ? (
            <ListRow
              tone="ok"
              title={<StyledOkTitle>{`이상 없음 ${okRows.length}`}</StyledOkTitle>}
              description={okRows.map((row) => OK_NAMES[row.key]).join(" · ")}
              count={<StyledFaint as="span">0</StyledFaint>}
            />
          ) : null}
        </ListRows>
      </StyledCardBody>
    </Card>
  );
};

// ── 일별 그래프 · 처리 결과 ───────────────────────────────────────────────
export const DailyCard = ({ daily }: { daily: DashboardResponseTypes["daily"] }) => (
  <Card padding={0}>
    <StyledCardBody aria-labelledby="dashboard-daily-title">
      <StyledCardHeading id="dashboard-daily-title">
        일별 운행 · 지연 <small>최근 {daily.length}일 · 칸마다 축 따로</small>
      </StyledCardHeading>
      <DailyLineChart points={daily.map((day) => ({ date: day.date, value: day.runCount }))} name="운행" color="var(--c-conf)" />
      <DailyLineChart points={daily.map((day) => ({ date: day.date, value: day.delayCount }))} name="지연" color="var(--c-move)" />
    </StyledCardBody>
  </Card>
);

const percentText = (value: number, total: number) => `${Math.round((value / Math.max(total, 1)) * 100)}%`;

export const ResultCard = ({ data }: { data: DashboardResponseTypes }) => {
  const { changeRequests, attention, daily } = data;
  const largest = Math.max(changeRequests.approved, changeRequests.rejected, changeRequests.autoRejected, 1);
  const rows = [
    { label: "승인", value: changeRequests.approved, color: "var(--c-conf)" },
    { label: "거절", value: changeRequests.rejected, color: "var(--c-end)" },
    { label: "자동 거절", value: changeRequests.autoRejected, color: "var(--c-move)" },
  ];
  const expiringCount = attention.expiringChangeRequests.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card padding={0}>
      <StyledCardBody aria-labelledby="dashboard-result-title">
        <StyledCardHeading id="dashboard-result-title">
          처리 결과 <small>누적 {changeRequests.total}건</small>
        </StyledCardHeading>
        {rows.map((row) => (
          <StyledHBar key={row.label}>
            <span>{row.label}</span>
            <StyledTrack>
              <StyledFill $color={row.color} $width={(row.value / largest) * 100} />
            </StyledTrack>
            <span>
              <b>{row.value}</b> ({percentText(row.value, changeRequests.total)})
            </span>
          </StyledHBar>
        ))}
        {expiringCount > 0 ? (
          <StyledFaint>
            지금 자동 거절 임박 <StyledWarnText>{expiringCount}건</StyledWarnText> ({attention.expiringChangeRequests[0].academyName} {attention.expiringChangeRequests[0].busNo}{" "}
            {directionLabel(attention.expiringChangeRequests[0].direction)})
          </StyledFaint>
        ) : null}
        <StyledCardHeading as="h3" style={{ marginTop: 16 }}>
          로그인 일별 실패 <small>최근 {daily.length}일</small>
        </StyledCardHeading>
        <DailyBarChart points={daily.map((day) => ({ date: day.date, value: day.loginFail }))} name="로그인 실패" color="var(--c-bad)" />
      </StyledCardBody>
    </Card>
  );
};
