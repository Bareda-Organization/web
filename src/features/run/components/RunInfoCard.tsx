"use client";

import { RunStatusChip, StatusChip } from "@/shared/ui";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import type { DashboardRunResponseTypes } from "../types";
import { delayedArrival, splitRiders } from "../lib/runBoard";
import { RiderSplitBar, RiderSplitLegend } from "./RiderSplitBar";
import { RouteAckMark } from "./RouteAckMark";
import {
  StyledCrewItem,
  StyledInfoCard,
  StyledInfoCardHead,
  StyledInfoCardSection,
  StyledInfoCardTitle,
  StyledInfoList,
  StyledInfoNote,
  StyledPhoneRow,
} from "./TodayRunPage.styled";

type Props = { run: DashboardRunResponseTypes; addedCount: number; transferCount: number };

const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;
const CONFIRM_LEAD_MS = 30 * 60_000;

// 전화번호는 표시와 tel: 링크까지만 둔다(복사 버튼은 사양 근거가 없어 지웠다 · Ruling 844).
const Phone = ({ phone }: { phone: string | null }) =>
  phone ? (
    <StyledPhoneRow>
      <a href={`tel:${phone}`}>{phone}</a>
    </StyledPhoneRow>
  ) : (
    <span>연락처 미등록</span>
  );

const Crew = ({ role, name, phone, acked, run }: { role: string; name: string | null; phone: string | null; acked: boolean; run: DashboardRunResponseTypes }) => (
  <StyledCrewItem>
    <i aria-hidden="true">{name ? name.charAt(0) : "?"}</i>
    <div>
      <b>{name ?? "미배치"}</b> <small>{role}</small>
      {name ? <Phone phone={phone} /> : null}
    </div>
    {name === null ? <StatusChip tone="bad" marker={false}>미배치</StatusChip> : <RouteAckMark name={name} acked={acked} runStatus={run.runStatus} />}
  </StyledCrewItem>
);

// 선택한 회차의 카드 — 출발 · 도착(예정 · 실제 · 예상) · 지연 알림 · 기사 · 동승자(전화 · 확인 여부) · 학생 현황.
// 지연·미승차가 났을 때 명단 표에서 전화번호를 찾지 않도록 연락처를 이 카드로 모았다.
export const RunInfoCard = ({ run, addedCount, transferCount }: Props) => {
  const confirmAt = Date.parse(run.departTime) - CONFIRM_LEAD_MS;
  const split = splitRiders(run);
  const delay = run.delayMinutes ?? 0;
  const estimated = delayedArrival(run);
  return (
    <StyledInfoCard aria-label="회차 정보">
      <StyledInfoCardHead>
        <StyledInfoCardTitle>
          {run.busNo} · {DIRECTION_LABEL[run.direction]}
        </StyledInfoCardTitle>
        <RunStatusChip status={run.runStatus} />
      </StyledInfoCardHead>
      <StyledInfoList>
        <div>
          <dt>출발</dt>
          <dd>
            예정 {formatClockTime(run.departTime)}
            {run.startedAt ? ` · 실제 ${formatClockTime(run.startedAt)}` : ""}
          </dd>
        </div>
        <div>
          <dt>도착</dt>
          <dd>
            예정 {run.estArrivalTime ? formatClockTime(run.estArrivalTime) : "-"}
            {run.finishedAt ? ` → 실제 ${formatClockTime(run.finishedAt)}` : estimated ? ` → 예상 ${formatClockTime(estimated)}` : ""}
            {delay > 0 && !run.finishedAt ? <StatusChip tone="warn" marker={false}>{delay}분 지연</StatusChip> : null}
          </dd>
        </div>
        {run.lastDelayNotice ? (
          <div>
            <dt>지연 알림</dt>
            <dd>
              {formatClockTime(run.lastDelayNotice.sentAt)} · 수신 {run.lastDelayNotice.recipientCount}건
            </dd>
          </div>
        ) : null}
        {run.runStatus === "idle" && Number.isFinite(confirmAt) ? (
          <div>
            <dt>확정</dt>
            <dd>
              {formatClockTime(new Date(confirmAt).toISOString())} (출발 30분 전)
            </dd>
          </div>
        ) : null}
      </StyledInfoList>

      <StyledInfoCardSection>
        <h3>배치 인력 · 변경 확인</h3>
        <Crew role="기사" name={run.driverName} phone={run.driverPhone} acked={run.ackDriver} run={run} />
        <Crew role="동승자" name={run.escortName} phone={run.escortPhone} acked={run.ackEscort} run={run} />
      </StyledInfoCardSection>

      <StyledInfoCardSection>
        <h3>학생 현황 · {run.totalCount}명</h3>
        <RiderSplitBar split={split} total={run.totalCount} />
        <RiderSplitLegend split={split} />
        <StyledInfoNote>
          {run.runStatus === "idle"
            ? `예정 명단${addedCount > 0 ? ` — 추가 ${addedCount}명${transferCount > 0 ? `(이동 대기 ${transferCount}${addedCount - transferCount > 0 ? ` · 강제 추가 ${addedCount - transferCount}` : ""})` : ""}이 확정 때 초록으로 확정됩니다.` : "입니다."}`
            : `확정된 회차 — 강제 승하차지 추가는 출발 30분 전${Number.isFinite(confirmAt) ? `(${formatClockTime(new Date(confirmAt).toISOString())})` : ""}까지만 가능했습니다.`}
        </StyledInfoNote>
      </StyledInfoCardSection>
    </StyledInfoCard>
  );
};
