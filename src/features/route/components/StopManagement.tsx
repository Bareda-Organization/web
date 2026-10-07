"use client";

import { useState } from "react";
import { usePagedList, useSavedNotice } from "@/shared/hooks";
import { WEEKDAY_LABEL } from "@/shared/lib/format/weekdayBatch";
import { AlertBanner, Button, Card, FilterBar, PageHeader, Pagination, RosterTable, SearchField } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getStops } from "../api";
import type { RunDirection, StopListItemTypes, StopRouteUsageTypes } from "../types";
import { StopEditDialog } from "./StopEditDialog";
import { StyledMuted, StyledRouteTag, StyledRouteTags, StyledStopGuide, StyledStopLayout } from "./StopManagement.styled";

const PAGE_SIZE = 20;
const DIRECTION_LABEL: Record<RunDirection, string> = { to_academy: "등원", from_academy: "하원" };

const routeLabel = (route: StopRouteUsageTypes) => `${route.busNo} · ${WEEKDAY_LABEL[route.weekday]} · ${DIRECTION_LABEL[route.direction]}`;

/**
 * 승하차지 관리(A-08, Ruling 849) — 학원의 승하차지를 한곳에 모아 보고 이름 · 주소 · 좌표를 고친다.
 *
 * <p>목록은 `GET /staff/stops`, 수정은 `PATCH /staff/stops/{id}` 다. 새로 만들기 · 삭제는 두지 않는다 — 승하차지는
 * 노선 저장과 학생 주소 매칭이 만들고, 지난 회차와 요일별 주소가 그 행을 가리키기 때문이다(§5.9).
 */
export const StopManagement = () => {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<StopListItemTypes | null>(null);
  const [missingNotice, setMissingNotice] = useState<string | null>(null);
  const { notice, highlightedKey, showNotice } = useSavedNotice();
  const { items, totalCount, hasNext, page, setPage, loading, error, reload } = usePagedList(
    (targetPage) => getStops(targetPage, PAGE_SIZE, q),
    { resetKey: q, errorMessage: "승하차지를 불러오지 못했습니다" },
  );

  const handleSaved = (saved: StopListItemTypes) => {
    setEditing(null);
    showNotice("승하차지를 수정했습니다", saved.stopId);
    reload();
  };

  const handleMissing = () => {
    setEditing(null);
    setMissingNotice("이미 없어졌거나 다른 학원의 승하차지입니다 — 목록을 다시 불러왔습니다");
    reload();
  };

  const columns: RosterColumn<StopListItemTypes>[] = [
    { key: "name", label: "이름", render: (row) => <b>{row.name}</b> },
    { key: "address", label: "주소" },
    {
      key: "routes",
      label: "쓰는 편성",
      render: (row) =>
        row.routes.length === 0 ? (
          <StyledMuted>쓰는 편성 없음</StyledMuted>
        ) : (
          <StyledRouteTags>
            {row.routes.map((route) => (
              <StyledRouteTag key={route.routeId} data-active={route.active}>
                {routeLabel(route)}
              </StyledRouteTag>
            ))}
          </StyledRouteTags>
        ),
    },
    { key: "studentCount", label: "이용 학생", render: (row) => `${row.studentCount}명` },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${row.name} 수정`}
          onClick={() => {
            setMissingNotice(null);
            setEditing(row);
          }}
        >
          수정
        </Button>
      ),
    },
  ];

  return (
    <StyledStopLayout>
      <PageHeader
        title="승하차지"
        description={error ? undefined : `총 ${totalCount}곳 — 노선 편성과 학생 주소가 함께 쓰는 정차 지점입니다`}
      />
      <StyledStopGuide>
        새 승하차지는 고정 노선 편성 화면에서 만듭니다. 여기서 고친 이름 · 주소 · 위치는 그 승하차지를 쓰는 모든 노선과 학생 주소에 반영됩니다.
      </StyledStopGuide>

      <FilterBar>
        <SearchField
          placeholder="이름 · 주소로 검색"
          onSubmit={(value) => setQ(value.trim())}
        />
      </FilterBar>

      {notice ? <AlertBanner tone="boarded" title={notice} role="status" /> : null}
      {missingNotice ? <AlertBanner tone="moving" title={missingNotice} role="status" /> : null}
      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card flush aria-busy={loading}>
        <RosterTable
          hasError={Boolean(error)}
          onRetry={reload}
          columns={columns}
          loading={loading}
          rows={items}
          getRowKey={(row) => row.stopId}
          highlightedKey={highlightedKey}
          emptyMessage={q ? `'${q}' 검색 결과가 없습니다` : "등록된 승하차지가 없습니다"}
        />
        <Pagination hasError={Boolean(error)} page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />
      </Card>

      {editing ? <StopEditDialog stop={editing} onClose={() => setEditing(null)} onSaved={handleSaved} onMissing={handleMissing} /> : null}
    </StyledStopLayout>
  );
};
