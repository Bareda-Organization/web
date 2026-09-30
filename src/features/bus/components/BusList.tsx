"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, Pagination, RosterTable } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getBuses } from "../api";
import type { BusItemResponseTypes } from "../types";
import { BusForm } from "./BusForm";
import { StyledBusLayout } from "./BusList.styled";

const PAGE_SIZE = 20;

// §5.12 GET /staff/buses(BUS-01, A-11) — 차량 관리 목록. 상세 GET 이 사양에 없어
// 수정은 이 목록의 행 데이터를 그대로 폼에 채운다(§2 판단 근거 참조).
export const BusList = () => {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<BusItemResponseTypes[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BusItemResponseTypes | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const data = await getBuses(nextPage, PAGE_SIZE);
      setItems(data.items);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "차량 목록을 불러오지 못했습니다");
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
    load(page);
  };

  const columns: RosterColumn<BusItemResponseTypes>[] = [
    { key: "busNo", label: "호차" },
    { key: "plateNo", label: "차량번호" },
    { key: "capacity", label: "정원" },
    { key: "studentCapacity", label: "탑승 가능 인원" },
    {
      key: "operable",
      label: "운행 가능",
      render: (row) => (row.operable ? <Badge tone="added">운행 가능</Badge> : <Badge tone="removed">운행 불가</Badge>),
    },
  ];

  return (
    <StyledBusLayout>
      <PageHeader
        title="차량 관리"
        description={`총 ${totalCount}대`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            차량 등록
          </Button>
        }
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable hasError={Boolean(error)} columns={columns} loading={loading} rows={items} getRowKey={(row) => row.id} onRowClick={setEditing} />
      </Card>

      <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {editing ? <BusForm bus={editing} onClose={() => setEditing(undefined)} onDone={handleDone} /> : null}
      {creating ? <BusForm onClose={() => setCreating(false)} onDone={handleDone} /> : null}
    </StyledBusLayout>
  );
};
