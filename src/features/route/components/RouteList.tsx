"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, Pagination, RosterTable } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getRoutes } from "../api";
import type { RouteListItemResponseTypes } from "../types";
import { RouteForm } from "./RouteForm";
import { StyledRouteLayout } from "./RouteList.styled";

const PAGE_SIZE = 20;
const WEEKDAY_LABEL: Record<string, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };
const DIRECTION_LABEL: Record<string, string> = { to_academy: "등원", from_academy: "하원" };

// §5.9 GET /staff/routes(RTE-01, §1.8 페이징) — 고정 노선 편성 목록. 비활성 편성도
// 실린다(편성 이력 보존). 행 클릭으로 정차 순서 관리 화면(RouteStopsPanel)으로 이동.
export const RouteList = () => {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<RouteListItemResponseTypes[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const data = await getRoutes(nextPage, PAGE_SIZE);
      setItems(data.items);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "노선 편성 목록을 불러오지 못했습니다");
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

  const columns: RosterColumn<RouteListItemResponseTypes>[] = [
    { key: "busNo", label: "차량" },
    { key: "weekday", label: "요일", render: (row) => WEEKDAY_LABEL[row.weekday] },
    { key: "direction", label: "방향", render: (row) => DIRECTION_LABEL[row.direction] },
    { key: "name", label: "편성 이름", render: (row) => row.name ?? "-" },
    {
      key: "active",
      label: "상태",
      render: (row) => <Badge tone={row.active ? "added" : "removed"}>{row.active ? "활성" : "비활성"}</Badge>,
    },
  ];

  return (
    <StyledRouteLayout>
      <PageHeader
        title="고정 노선 편성"
        description={`총 ${totalCount}건`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            편성 등록
          </Button>
        }
      />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable hasError={Boolean(error)}
          columns={columns}
          loading={loading}
          rows={items}
          getRowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/route/${row.id}`)}
        />
      </Card>

      <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {creating ? (
        <RouteForm
          onClose={() => setCreating(false)}
          // 저장하면 만든 편성의 상세로 이어 간다 — 정차지를 넣는 것이 다음 일이다(B1 #10).
          onDone={({ id }) => {
            setCreating(false);
            router.push(`/route/${id}`);
          }}
        />
      ) : null}
    </StyledRouteLayout>
  );
};
