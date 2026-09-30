"use client";

import { useCallback, useEffect, useState } from "react";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, Input, RosterTable } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getRuns } from "../api";
import type { RunItemResponseTypes, RunStatus, ScheduleDirection } from "../types";
import { RunAddForm } from "./RunAddForm";
import { RunCancelDialog } from "./RunCancelDialog";
import { StyledScheduleFilters, StyledScheduleSection } from "./ScheduleList.styled";

const DIRECTION_LABEL: Record<ScheduleDirection, string> = { to_academy: "등원", from_academy: "하원" };

// RunStatus 는 회차의 생애주기(idle→confirmed→moving→finished)라 shared/ui 의
// StatusPill(boarded·moving·missed·idle, 탑승 상태 축)과 값 집합이 안 맞는다(§2 확신
// 없는 지점 — StatusPill.tsx 실측 확인 후 재사용을 포기하고 Badge 로 대체). ScheduleList
// 의 active·report 의 handled 와 같은 방식.
const STATUS_LABEL: Record<RunStatus, string> = {
  idle: "운행 전",
  confirmed: "확정",
  moving: "이동 중",
  finished: "종료",
};

// §5.10 DELETE — `idle`·`confirmed` 만 취소된다(운행이 시작된 회차는 409 RUN_ALREADY_STARTED).
const CANCELABLE_STATUS: RunStatus[] = ["idle", "confirmed"];

const STATUS_TONE: Record<RunStatus, "neutral" | "brand" | "amber" | "added"> = {
  idle: "neutral",
  confirmed: "brand",
  moving: "amber",
  finished: "added",
};

// §5.10 GET /staff/runs?service_date=(SCH-02) — 특정일 회차 목록. 정규 스케줄 배치
// 결과 확인 + 임시 회차 추가·취소(SCH-03) 를 한 화면에서 다룬다. 페이징 없음(실측
// 확인, types/index.ts 주석) — 맨 배열을 그대로 전부 그린다.
export const RunDayList = () => {
  const [serviceDate, setServiceDate] = useState(todayInSeoul());
  const [items, setItems] = useState<RunItemResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

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
    setCancelingId(null);
    load(serviceDate);
  };

  const columns: RosterColumn<RunItemResponseTypes>[] = [
    { key: "busNo", label: "차량" },
    { key: "direction", label: "방향", render: (row) => DIRECTION_LABEL[row.direction] },
    { key: "departTime", label: "출발 시각", render: (row) => formatClockTime(row.departTime) },
    {
      key: "confirmAt",
      label: "확정 시각",
      render: (row) => formatClockTime(row.confirmAt),
    },
    { key: "route", label: "출발지 · 도착지", render: (row) => `${row.originName} → ${row.destinationName}` },
    {
      key: "assignments",
      label: "배정",
      render: (row) =>
        row.assignments.length > 0
          ? row.assignments.map((assignment) => `${assignment.name}(${assignment.role === "driver" ? "기사" : "동승자"})`).join(", ")
          : "-",
    },
    {
      key: "origin",
      label: "구분",
      render: (row) => (row.scheduleId === null ? <Badge tone="amber">임시 회차</Badge> : null),
    },
    {
      key: "status",
      label: "상태",
      render: (row) =>
        row.canceledAt ? <Badge tone="removed">취소됨</Badge> : <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>,
    },
    {
      // W4 — 확정이 계속 실패하는 회차를 목록에서 바로 알아본다(`API_SPEC §5.10`
      // `consecutive_failures`, BR-047). 0(성공)이면 표시하지 않는다.
      key: "consecutiveFailures",
      label: "",
      render: (row) => (row.consecutiveFailures > 0 ? <Badge tone="red">확정 {row.consecutiveFailures}회 연속 실패</Badge> : null),
    },
    {
      key: "cancel",
      label: "",
      align: "right",
      render: (row) =>
        row.canceledAt || !CANCELABLE_STATUS.includes(row.status) ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setCancelingId(row.id);
            }}
          >
            취소
          </Button>
        ),
    },
  ];

  return (
    <StyledScheduleSection>
      <StyledScheduleFilters>
        <Input label="날짜" type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} />
        <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
          임시 회차 추가
        </Button>
      </StyledScheduleFilters>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} loading={loading} rows={items} getRowKey={(row) => row.id} />
      </Card>

      {adding ? <RunAddForm serviceDate={serviceDate} onClose={() => setAdding(false)} onDone={handleAdded} /> : null}
      {cancelingId !== null ? (
        <RunCancelDialog runId={cancelingId} onCancel={() => setCancelingId(null)} onCanceled={handleCanceled} />
      ) : null}
    </StyledScheduleSection>
  );
};
