"use client";

import { useCallback, useEffect, useState } from "react";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, Input, RosterTable, RunStatusChip, StatusChip } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getRuns } from "../api";
import type { RunItemResponseTypes, RunStatus, ScheduleDirection } from "../types";
import { addDays } from "../lib/scheduleBoard";
import { RunAddForm } from "./RunAddForm";
import { RunCancelDialog } from "./RunCancelDialog";
import { StyledCancelText, StyledDateNav, StyledRunNote, StyledRunSub, StyledRunTime, StyledScheduleSection } from "./ScheduleList.styled";

const DIRECTION_LABEL: Record<ScheduleDirection, string> = { to_academy: "등원", from_academy: "하원" };

// §5.10 DELETE — `idle`·`confirmed` 만 취소된다(운행이 시작된 회차는 409 RUN_ALREADY_STARTED).
const CANCELABLE_STATUS: RunStatus[] = ["idle", "confirmed"];

type RunDayListProps = {
  /** 헤더의 [임시 회차 추가] 가 여는 추가 창 — 화면(탭 + 헤더)이 쥔다. 안 주면 이 목록이 스스로 쥔다 */
  adding?: boolean;
  onAddingChange?: (next: boolean) => void;
};

// §5.10 GET /staff/runs?service_date=(SCH-02) — 특정일 회차 목록. 정규 스케줄 배치
// 결과 확인 + 임시 회차 추가·취소(SCH-03) 를 한 화면에서 다룬다. 페이징 없음(실측
// 확인, types/index.ts 주석) — 맨 배열을 그대로 전부 그린다.
export const RunDayList = ({ adding: addingProp, onAddingChange }: RunDayListProps = {}) => {
  const [serviceDate, setServiceDate] = useState(todayInSeoul());
  const [items, setItems] = useState<RunItemResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownAdding, setOwnAdding] = useState(false);
  const [canceling, setCanceling] = useState<RunItemResponseTypes | undefined>(undefined);
  const adding = addingProp ?? ownAdding;
  const setAdding = onAddingChange ?? setOwnAdding;
  const [today] = useState(() => todayInSeoul());

  const load = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const data = await getRuns(date);
      setItems(data.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "일일 회차를 불러오지 못했습니다");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(serviceDate);
    })();
  }, [serviceDate, load]);

  const handleAdded = () => {
    setAdding(false);
    load(serviceDate);
  };

  const handleCanceled = () => {
    setCanceling(undefined);
    load(serviceDate);
  };

  const temporary = items.filter((run) => run.scheduleId === null).length;
  const canceled = items.filter((run) => run.canceledAt).length;

  const columns: RosterColumn<RunItemResponseTypes>[] = [
    { key: "departTime", label: "출발", render: (row) => <StyledRunTime>{formatClockTime(row.departTime)}</StyledRunTime> },
    {
      key: "busNo",
      label: "호차 · 방향",
      render: (row) => (
        <>
          {row.busNo} · {DIRECTION_LABEL[row.direction]}
          <StyledRunSub>{row.originName} → {row.destinationName}</StyledRunSub>
        </>
      ),
    },
    {
      key: "status",
      label: "상태",
      render: (row) =>
        row.canceledAt ? (
          <StatusChip tone="off" marker={false}>
            취소됨
          </StatusChip>
        ) : (
          <>
            <RunStatusChip status={row.status} />
            {/* W4 — 확정이 계속 실패하는 회차를 목록에서 바로 알아본다(`API_SPEC §5.10` `consecutive_failures`, BR-047). 0(성공)이면 표시하지 않는다. */}
            {row.consecutiveFailures > 0 ? <StatusChip tone="bad" marker={false}>확정 {row.consecutiveFailures}회 연속 실패</StatusChip> : null}
          </>
        ),
    },
    {
      key: "confirmAt",
      label: "확정 시각",
      render: (row) => (
        <>
          {formatClockTime(row.confirmAt)}
          <StyledRunSub>{row.status === "idle" ? "확정 예정" : "확정됨"}</StyledRunSub>
        </>
      ),
    },
    { key: "origin", label: "구분", render: (row) => (row.scheduleId === null ? <Badge tone="amber">임시 회차</Badge> : "정규") },
    {
      key: "assignments",
      label: "배정 인력",
      render: (row) => {
        const driver = row.assignments.find((assignment) => assignment.role === "driver");
        const escort = row.assignments.find((assignment) => assignment.role === "escort");
        return (
          <>
            {driver ? `기사 ${driver.name}` : <StatusChip tone="bad">기사 미배치</StatusChip>}
            <StyledRunSub>{escort ? `동승 ${escort.name}` : "동승 미배치"}</StyledRunSub>
          </>
        );
      },
    },
    {
      key: "cancel",
      label: "",
      align: "right",
      render: (row) =>
        row.canceledAt ? null : !CANCELABLE_STATUS.includes(row.status) ? (
          <StyledCancelText>운행 시작됨</StyledCancelText>
        ) : (
          <Button
            variant="ghostDanger"
            size="sm"
            aria-label={`${formatClockTime(row.departTime)} ${row.busNo} ${DIRECTION_LABEL[row.direction]} 회차 취소`}
            onClick={(event) => {
              event.stopPropagation();
              setCanceling(row);
            }}
          >
            회차 취소
          </Button>
        ),
    },
  ];

  return (
    <StyledScheduleSection>
      <StyledDateNav>
        <Input label="날짜" type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
        <Button variant="ghost" size="sm" iconOnly icon="chevron-left" aria-label="전날" onClick={() => setServiceDate(addDays(serviceDate, -1))} />
        <Button variant="ghost" size="sm" iconOnly icon="chevron-right" aria-label="다음날" onClick={() => setServiceDate(addDays(serviceDate, 1))} />
        <Button variant="ghost" size="sm" disabled={serviceDate === today} onClick={() => setServiceDate(today)}>
          오늘
        </Button>
        <span data-total>
          회차 {items.length} · 임시 추가 {temporary} · 취소 {canceled}
        </span>
      </StyledDateNav>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card flush aria-busy={loading}>
        <RosterTable hasError={Boolean(error)} onRetry={() => load(serviceDate)} emptyMessage="이 날짜의 회차가 없습니다" columns={columns} loading={loading} rows={items} getRowKey={(row) => row.id}
          // 기사가 안 정해진 아직 안 끝난 회차는 위험 행(오늘 현황과 같은 기준).
          rowTone={(row) => (!row.canceledAt && row.status !== "finished" && !row.assignments.some((assignment) => assignment.role === "driver") ? "bad" : undefined)} />
        <StyledRunNote>확정 시각은 출발 30분 전입니다. 휴원 · 특강은 임시 추가 · 취소로 처리하고 정규 스케줄은 바꾸지 않습니다. 이미 운행이 시작된 회차는 취소할 수 없습니다.</StyledRunNote>
      </Card>

      {adding ? <RunAddForm serviceDate={serviceDate} onClose={() => setAdding(false)} onDone={handleAdded} /> : null}
      {canceling ? <RunCancelDialog runId={canceling.id} run={canceling} onCancel={() => setCanceling(undefined)} onCanceled={handleCanceled} /> : null}
    </StyledScheduleSection>
  );
};
