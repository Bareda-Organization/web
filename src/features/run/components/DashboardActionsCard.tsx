"use client";

import Link from "next/link";
import { ListRow, ListRows, StatusChip } from "@/shared/ui";
import type { DashboardRunResponseTypes } from "../types";
import { runAttention } from "../lib/runBoard";
import { StyledActionList, StyledBoardCard, StyledBoardCardHead, StyledCountPill } from "./DashboardPage.styled";

export type PendingApprovals = {
  signupCount: number;
  changeCount: number;
  nextDeadlineAt: string | null;
  isReady: boolean;
};

type Props = {
  runs: DashboardRunResponseTypes[];
  unassignedManagers: number;
  approvals: PendingApprovals;
  nowMs: number;
};

const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;

// 기한까지 남은 시간 — 분 단위로 올림("6분"). 이미 지났으면 null. (approval 기능의 초 단위 포맷은 기능 경계 때문에 가져오지 않는다)
const formatMinutesLeft = (deadlineMs: number, nowMs: number): string | null => {
  const minutes = Math.ceil((deadlineMs - nowMs) / 60_000);
  return minutes > 0 ? `${minutes}분` : null;
};

type ActionItem = { key: string; tone: "bad" | "warn" | "info"; title: React.ReactNode; description: string; count: React.ReactNode };

// 지금 처리할 것 — 긴급도 순(미승차 → 출발 임박 미확인 → 구간 변경 승인 → 가입 승인 → 배치 없는 매니저).
// 흩어져 있던 처리 대기 띠 · 지표 · 표의 경고를 한 곳으로 모은다. 값이 0 인 항목은 그리지 않는다.
export const DashboardActionsCard = ({ runs, unassignedManagers, approvals, nowMs }: Props) => {
  const items: (ActionItem & { href: string })[] = [];

  const noShowRuns = runs.filter((run) => run.noShowCases.length > 0);
  const noShowTotal = noShowRuns.reduce((sum, run) => sum + run.noShowCases.length, 0);
  if (noShowTotal > 0) {
    const first = noShowRuns[0];
    const nearestExpiry = Math.min(...noShowRuns.flatMap((run) => run.noShowCases.map((c) => Date.parse(c.expiresAt))));
    const minutesLeft = Math.max(1, Math.ceil((nearestExpiry - nowMs) / 60_000));
    items.push({
      key: "no-show",
      tone: "bad",
      title: (
        <>
          미승차 {noShowTotal}명 <StatusChip tone="warn" marker={false}>{minutesLeft}분 안</StatusChip>
        </>
      ),
      description: `${first.busNo} ${DIRECTION_LABEL[first.direction]} · ${first.noShowCases[0].stopName} · 보호자 연락 중`,
      count: noShowTotal,
      href: `/today-run?runId=${first.runId}`,
    });
  }

  runs.forEach((run) => {
    const attention = runAttention(run, nowMs);
    if (attention?.tone !== "warn" || !attention.reason.startsWith("출발")) return;
    const unacked = [run.ackDriver ? null : `기사 ${run.driverName ?? ""}`, run.ackEscort ? null : `동승 ${run.escortName ?? ""}`].filter(Boolean);
    items.push({
      key: `imminent-${run.runId}`,
      tone: "warn",
      title: `${run.busNo} ${DIRECTION_LABEL[run.direction]} ${attention.reason}`,
      description: `${unacked.join(" · ")} 미확인`,
      count: attention.reason.replace("출발 ", "").replace(" 전", ""),
      href: `/today-run?runId=${run.runId}`,
    });
  });

  if (approvals.isReady && approvals.changeCount > 0) {
    const remaining = approvals.nextDeadlineAt ? formatMinutesLeft(Date.parse(approvals.nextDeadlineAt), nowMs) : null;
    items.push({
      key: "change",
      tone: "warn",
      title: "구간 변경 승인",
      description: remaining ? `처리하지 않으면 처리 기한에 자동 거절 · 가장 이른 건 ${remaining} 남음` : "기한이 지난 신청이 있습니다",
      count: approvals.changeCount,
      href: "/change-approval",
    });
  }
  if (approvals.isReady && approvals.signupCount > 0) {
    items.push({ key: "signup", tone: "info", title: "가입 승인", description: "오래 기다린 순으로 처리합니다", count: approvals.signupCount, href: "/signup-approval" });
  }
  if (unassignedManagers > 0) {
    const gap = runs.find((run) => run.runStatus !== "finished" && (run.driverName === null || run.escortName === null));
    items.push({
      key: "unassigned",
      tone: "info",
      title: "배치 없는 매니저",
      description: gap ? `${gap.busNo} ${DIRECTION_LABEL[gap.direction]} ${gap.driverName === null ? "기사" : "동승자"} 배치 필요` : "오늘 회차에 배치되지 않은 매니저가 있습니다",
      count: unassignedManagers,
      href: "/manager",
    });
  }

  return (
    <StyledBoardCard aria-label="지금 처리할 것">
      <StyledBoardCardHead>
        <h2>지금 처리할 것</h2>
        {items.length > 0 ? <StyledCountPill>{items.length}건</StyledCountPill> : null}
      </StyledBoardCardHead>
      <StyledActionList>
        {items.length === 0 ? (
          <p>지금 처리할 일이 없습니다</p>
        ) : (
          <ListRows>
            {items.map((item) => (
              <ListRow
                key={item.key}
                tone={item.tone}
                title={<Link href={item.href}>{item.title}</Link>}
                description={item.description}
                count={item.count}
              />
            ))}
          </ListRows>
        )}
      </StyledActionList>
    </StyledBoardCard>
  );
};
