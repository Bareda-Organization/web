"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, RosterTable, RunStatusChip } from "@/shared/ui";
import { TimetableBar } from "@/shared/ui/display";
import type { RosterColumn } from "@/shared/types";
import { formatClockTime, formatClockTimeWithSeconds } from "@/shared/lib/format/clockTime";
import { timetableRange } from "@/shared/lib/timetable/timetable";
import type { DashboardRunResponseTypes } from "../types";
import { runAttention } from "../lib/runBoard";
import { RouteAckMark } from "./RouteAckMark";
import {
  StyledBoardCard,
  StyledBoardCardHead,
  StyledBoardCardTools,
  StyledChangeNote,
  StyledDepartCell,
  StyledStaffCell,
  StyledStatusCell,
} from "./DashboardPage.styled";

type Props = {
  runs: DashboardRunResponseTypes[];
  loading: boolean;
  hasError: boolean;
  nowMs: number;
};

const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;

// 상태 칩 아래 한 줄 사유 — 종료는 실제 구간, 운행 중 지연 · 출발 임박 · 기사 미배치는 긴급도 사유.
const statusNote = (run: DashboardRunResponseTypes, attentionReason: string | undefined): { text: string; tone?: "warn" | "bad" } | null => {
  if (attentionReason) return { text: attentionReason, tone: run.driverName === null ? "bad" : "warn" };
  if (run.runStatus === "finished" && run.startedAt && run.finishedAt) {
    return { text: `실제 ${formatClockTime(run.startedAt)} → ${formatClockTime(run.finishedAt)}` };
  }
  return null;
};

// 오늘 운행 표 — 출발 · 호차 · 상태(+사유) · 시간표 막대 · 탑승 · 배치 인력과 변경 확인을 한 줄에 둔다.
// 같은 6개 회차를 버스 목록과 표에 두 번 그리던 것을 이 표 하나로 합쳤다.
export const DashboardRunsCard = ({ runs, loading, hasError, nowMs }: Props) => {
  const router = useRouter();
  const range = timetableRange(runs, nowMs);

  const columns: RosterColumn<DashboardRunResponseTypes>[] = [
    {
      key: "departTime",
      label: "출발",
      render: (row) => (
        <StyledDepartCell
          title={[
            `예정 출발 ${formatClockTimeWithSeconds(row.departTime)}`,
            row.startedAt ? `실제 출발 ${formatClockTimeWithSeconds(row.startedAt)}` : null,
            row.estArrivalTime ? `예정 도착 ${formatClockTimeWithSeconds(row.estArrivalTime)}` : null,
            row.finishedAt ? `실제 도착 ${formatClockTimeWithSeconds(row.finishedAt)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          {formatClockTime(row.departTime)}
        </StyledDepartCell>
      ),
    },
    { key: "busNo", label: "호차 · 방향", render: (row) => `${row.busNo} · ${DIRECTION_LABEL[row.direction]}` },
    {
      key: "runStatus",
      label: "상태",
      render: (row) => {
        const note = statusNote(row, runAttention(row, nowMs)?.reason);
        return (
          <StyledStatusCell>
            <RunStatusChip status={row.runStatus} />
            {note ? <small data-tone={note.tone}>{note.text}</small> : null}
          </StyledStatusCell>
        );
      },
    },
    {
      key: "timetable",
      label: `시간표 ${formatClockTime(new Date(range.startMs).toISOString())} — ${formatClockTime(new Date(range.endMs).toISOString())}`,
      render: (row) => <TimetableBar run={row} range={range} tone={row.runStatus} nowMs={nowMs} />,
    },
    {
      key: "boardedCount",
      label: "탑승",
      align: "right",
      render: (row) => (
        <>
          {row.boardedCount}/{row.totalCount}
          {row.addedCount || row.removedCount ? <StyledChangeNote>추가 {row.addedCount} · 제외 {row.removedCount}</StyledChangeNote> : null}
        </>
      ),
    },
    {
      key: "staff",
      label: "배치 인력 · 변경 확인",
      render: (row) => (
        <StyledStaffCell>
          <span>
            <small>기사</small>
            <b>{row.driverName ?? "미배치"}</b>
            <RouteAckMark name={row.driverName} acked={row.ackDriver} runStatus={row.runStatus} />
          </span>
          <span>
            <small>동승</small>
            <b>{row.escortName ?? "미배치"}</b>
            <RouteAckMark name={row.escortName} acked={row.ackEscort} runStatus={row.runStatus} />
          </span>
        </StyledStaffCell>
      ),
    },
  ];

  return (
    <StyledBoardCard aria-label="오늘 운행">
      <StyledBoardCardHead>
        <h2>운행 {runs.length}회</h2>
        <p>출발 순 · 가는 세로선 = 지금 {formatClockTime(new Date(nowMs).toISOString())}</p>
        <StyledBoardCardTools>
          <Link href="/today-run">
            <Icon name="arrow-right" size={14} /> 운행 상세
          </Link>
        </StyledBoardCardTools>
      </StyledBoardCardHead>
      <RosterTable
        hasError={hasError}
        columns={columns}
        loading={loading}
        rows={runs}
        emptyMessage="오늘 등록된 회차가 없습니다"
        getRowKey={(row) => row.runId}
        rowTone={(row) => runAttention(row, nowMs)?.tone}
        onRowClick={(row) => router.push(`/today-run?runId=${row.runId}`)}
      />
    </StyledBoardCard>
  );
};
