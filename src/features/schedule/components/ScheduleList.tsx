"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, Pagination, RosterTable } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getSchedules } from "../api";
import type { ScheduleDirection, ScheduleItemResponseTypes, ScheduleWeekday } from "../types";
import { ScheduleCopyDialog } from "./ScheduleCopyDialog";
import { ScheduleDeleteDialog } from "./ScheduleDeleteDialog";
import { ScheduleForm } from "./ScheduleForm";
import { StyledScheduleSection } from "./ScheduleList.styled";

const PAGE_SIZE = 20;

const WEEKDAY_LABEL: Record<ScheduleWeekday, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};

const DIRECTION_LABEL: Record<ScheduleDirection, string> = { to_academy: "등원", from_academy: "하원" };

// §5.10 GET /staff/schedules(SCH-01, A-09) — 정규 스케줄 목록·등록·수정·삭제.
// 상세 GET 이 사양에 없어(bus 관리와 같은 형태) 수정은 이 목록의 행 데이터를 그대로
// 폼에 채운다(판단 근거, 보고서 §1).
export const ScheduleList = () => {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<ScheduleItemResponseTypes[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScheduleItemResponseTypes | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copying, setCopying] = useState<ScheduleItemResponseTypes | undefined>(undefined);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const data = await getSchedules(nextPage, PAGE_SIZE);
      setItems(data.items);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "운행 스케줄을 불러오지 못했습니다");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(page);
    })();
  }, [page, load]);

  const handleDone = () => {
    setEditing(undefined);
    setCreating(false);
    setCopying(undefined);
    load(page);
  };

  const handleDeleted = () => {
    setDeletingId(null);
    load(page);
  };

  const columns: RosterColumn<ScheduleItemResponseTypes>[] = [
    { key: "busNo", label: "차량" },
    { key: "weekday", label: "요일", render: (row) => WEEKDAY_LABEL[row.weekday] },
    { key: "direction", label: "방향", render: (row) => DIRECTION_LABEL[row.direction] },
    { key: "departTime", label: "출발 시각" },
    {
      key: "route",
      label: "출발지 · 도착지",
      render: (row) => `${row.originName} → ${row.destinationName}`,
    },
    {
      key: "active",
      label: "상태",
      render: (row) => (row.active ? <Badge tone="added">활성</Badge> : <Badge tone="removed">비활성</Badge>),
    },
    {
      key: "delete",
      label: "",
      align: "right",
      render: (row) => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setCopying(row);
            }}
          >
            복사
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setDeletingId(row.id);
            }}
          >
            삭제
          </Button>
        </>
      ),
    },
  ];

  return (
    <StyledScheduleSection>
      <PageHeader
        title="운행 스케줄"
        description={`총 ${totalCount}건`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            스케줄 등록
          </Button>
        }
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable hasError={Boolean(error)} columns={columns} loading={loading} rows={items} getRowKey={(row) => row.id} onRowClick={setEditing} />
      </Card>

      <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {editing ? <ScheduleForm schedule={editing} onClose={() => setEditing(undefined)} onDone={handleDone} /> : null}
      {creating ? <ScheduleForm onClose={() => setCreating(false)} onDone={handleDone} /> : null}
      {copying ? <ScheduleCopyDialog schedule={copying} onClose={() => setCopying(undefined)} onDone={handleDone} /> : null}
      {deletingId !== null ? (
        <ScheduleDeleteDialog
          scheduleId={deletingId}
          onCancel={() => setDeletingId(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
    </StyledScheduleSection>
  );
};
