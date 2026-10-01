"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountPasswordResetDialog } from "@/features/auth";
import { ApiError } from "@/shared/lib/http";
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  PageHeader,
  Pagination,
  RosterTable,
  SearchField,
} from "@/shared/ui";
import { useSavedNotice } from "@/shared/hooks";
import type { RosterColumn } from "@/shared/types";
import { getManagers } from "../api";
import type { ManagerItemResponseTypes } from "../types";
import { ManagerDeleteDialog } from "./ManagerDeleteDialog";
import { ManagerForm } from "./ManagerForm";
import {
  StyledManagerLayout,
  StyledManagerToolbar,
} from "./ManagerList.styled";

const PAGE_SIZE = 20;
const ROLE_LABEL: Record<ManagerItemResponseTypes["role"], string> = {
  driver: "기사",
  escort: "동승자",
};

// §5.13 GET /staff/managers?q=(MGR-01, A-12) — 매니저 관리 목록. 상세 GET 이 사양에
// 없어 수정은 이 목록의 행 데이터를 그대로 폼에 채운다.
export const ManagerList = () => {
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ManagerItemResponseTypes[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notice, highlightedKey, showNotice } = useSavedNotice();
  const [editing, setEditing] = useState<ManagerItemResponseTypes | undefined>(
    undefined,
  );
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<
    ManagerItemResponseTypes | undefined
  >(undefined);
  const [resetting, setResetting] = useState<
    ManagerItemResponseTypes | undefined
  >(undefined);

  const load = useCallback(async (nextPage: number, query: string) => {
    setLoading(true);
    try {
      const data = await getManagers(nextPage, PAGE_SIZE, query || undefined);
      setItems(data.items);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "매니저 목록을 불러오지 못했습니다",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load(page, q);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (value: string) => {
    setQ(value);
    setPage(0);
    load(0, value);
  };

  // savedManagerId — 등록·수정한 매니저의 id(삭제는 없다). 그 행을 잠깐 강조한다.
  const handleDone = (savedManagerId?: string) => {
    showNotice("변경 사항을 반영했습니다", savedManagerId);
    setEditing(undefined);
    setCreating(false);
    setDeleting(undefined);
    load(page, q);
  };

  const columns: RosterColumn<ManagerItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "phone", label: "전화번호" },
    {
      key: "role",
      label: "역할",
      render: (row) => <Badge tone="brand">{ROLE_LABEL[row.role]}</Badge>,
    },
    {
      // B1 #8 — 앱에서 가입 신청해 승인을 받으면 이 기록에 계정이 연결된다. 그 전에는 앱에 들어올 수 없다.
      key: "accountId",
      label: "앱 계정",
      render: (row) => <Badge tone={row.accountId ? "added" : "neutral"}>{row.accountId ? "연결됨" : "앱 가입 전"}</Badge>,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <>
          {/* 관리자 경유 비밀번호 초기화(§5.22) — 계정이 연결된 매니저만 */}
          {row.accountId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                setResetting(row);
              }}
            >
              비밀번호 초기화
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setDeleting(row);
            }}
          >
            삭제
          </Button>
        </>
      ),
    },
  ];

  return (
    <StyledManagerLayout>
      <PageHeader
        title="매니저 관리"
        description={error ? undefined : q ? `'${q}' 검색 결과 ${totalCount}명` : `총 ${totalCount}명`}
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setCreating(true)}
          >
            매니저 등록
          </Button>
        }
      />

      <StyledManagerToolbar>
        <SearchField placeholder="이름으로 검색" onSubmit={handleSearch} />
      </StyledManagerToolbar>

      {error ? <AlertBanner tone="missed" title={error} /> : null}
      {notice ? <AlertBanner tone="boarded" title={notice} role="status" /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable hasError={Boolean(error)} onRetry={() => load(page, q)}
          emptyMessage={q ? `'${q}' 검색 결과가 없습니다` : "등록된 매니저가 없습니다"}
          emptyAction={q ? undefined : { label: "매니저 등록", onClick: () => setCreating(true) }}
          highlightedKey={highlightedKey}
          columns={columns}
          loading={loading}
          rows={items}
          getRowKey={(row) => row.id}
          onRowClick={setEditing}
        />
      </Card>

      <Pagination hasError={Boolean(error)}
        page={page}
        size={PAGE_SIZE}
        totalCount={totalCount}
        hasNext={hasNext}
        onPageChange={setPage}
      />

      {editing ? (
        <ManagerForm
          manager={editing}
          onClose={() => setEditing(undefined)}
          onDone={handleDone}
        />
      ) : null}
      {creating ? (
        <ManagerForm onClose={() => setCreating(false)} onDone={handleDone} />
      ) : null}
      {deleting ? (
        <ManagerDeleteDialog
          manager={deleting}
          onClose={() => setDeleting(undefined)}
          onDone={handleDone}
        />
      ) : null}
      {resetting?.accountId ? (
        <AccountPasswordResetDialog
          accountId={resetting.accountId}
          name={resetting.name}
          onClose={() => setResetting(undefined)}
        />
      ) : null}
    </StyledManagerLayout>
  );
};
