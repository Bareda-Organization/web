"use client";

import { RunStatusChip } from "@/shared/ui";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import type { DashboardRunResponseTypes } from "../types";
import { runAttention } from "../lib/runBoard";
import { StyledRunCard, StyledRunCardNote, StyledRunCardRow, StyledRunCardTrack, StyledRunStrip } from "./TodayRunPage.styled";

type Props = {
  runs: DashboardRunResponseTypes[];
  selectedRunId: string | null;
  nowMs: number;
  onSelect: (runId: string) => void;
};

const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;

// 오늘 회차를 한 줄 카드로 — 출발 시각 · 호차 방향 · 상태 · 탑승 진행 · 한 줄 사유. 하루 전체의 진행이 한 줄에 보이고 회차 전환이 한 번의 누름이다.
export const RunStrip = ({ runs, selectedRunId, nowMs, onSelect }: Props) => (
  <StyledRunStrip aria-label="오늘 회차">
    {runs.map((run) => {
      const selected = run.runId === selectedRunId;
      const attention = runAttention(run, nowMs);
      const progress = run.totalCount === 0 ? 0 : Math.min(100, (run.boardedCount / run.totalCount) * 100);
      return (
        <StyledRunCard
          key={run.runId}
          type="button"
          $selected={selected}
          aria-pressed={selected}
          aria-label={`${formatClockTime(run.departTime)} ${run.busNo} ${DIRECTION_LABEL[run.direction]}`}
          onClick={() => onSelect(run.runId)}
        >
          <StyledRunCardRow>
            <strong>{formatClockTime(run.departTime)}</strong>
            <span>
              {run.busNo} · {DIRECTION_LABEL[run.direction]}
            </span>
          </StyledRunCardRow>
          <RunStatusChip status={run.runStatus} />
          <StyledRunCardTrack aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </StyledRunCardTrack>
          <StyledRunCardRow>
            <StyledRunCardNote data-tone={attention?.tone}>{attention?.reason ?? ""}</StyledRunCardNote>
            <span>
              탑승 {run.boardedCount}/{run.totalCount}
            </span>
          </StyledRunCardRow>
        </StyledRunCard>
      );
    })}
  </StyledRunStrip>
);
