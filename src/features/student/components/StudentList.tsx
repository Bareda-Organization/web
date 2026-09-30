"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, PageHeader, Pagination, RosterTable, SearchField } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getStudents } from "../api";
import type { StudentListItemResponseTypes } from "../types";
import { StudentForm } from "./StudentForm";
import { StudentWithdrawDialog } from "./StudentWithdrawDialog";
import { StyledStudentLayout, StyledStudentToolbar } from "./StudentList.styled";

const PAGE_SIZE = 20;

// §5.11 GET /staff/students?q=(STU-01, A-10) — 학생 관리 목록. 행 클릭으로 수정,
// 별도 버튼으로 퇴원(soft delete) 처리. 타 학원 학생은 404 로 존재 자체를 감춘다
// (§1.11 표는 이 화면을 다루지 않음 — Ruling 163, 확인 근거는 보고서 §2).
export const StudentList = () => {
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<StudentListItemResponseTypes[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [withdrawing, setWithdrawing] = useState<StudentListItemResponseTypes | undefined>(undefined);

  // 요청마다 번호를 매겨 마지막 요청의 응답만 화면에 반영한다 — 필터·쪽을 빠르게 바꿀 때 늦게 온 옛 응답이 새 목록을 덮지 않게 한다(F02-04).
  const requestSeq = useRef(0);

  const load = useCallback(async (nextPage: number, query: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await getStudents(nextPage, PAGE_SIZE, query || undefined);
      if (seq !== requestSeq.current) return;
      setItems(data.items);
      setTotalCount(data.totalCount);
      setHasNext(data.hasNext);
      setError(null);
    } catch (cause) {
      if (seq !== requestSeq.current) return;
      setError(cause instanceof ApiError ? cause.message : "학생 목록을 불러오지 못했습니다");
      setItems([]);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
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
    // 0쪽이 아니면 쪽이 바뀌며 아래 effect 가 이 검색어로 조회한다 — 여기서도 부르면 같은 요청이 두 번 나간다.
    if (page !== 0) {
      setPage(0);
      return;
    }
    load(0, value);
  };

  const handleDone = () => {
    setEditingId(undefined);
    setCreating(false);
    setWithdrawing(undefined);
    load(page, q);
  };

  const columns: RosterColumn<StudentListItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "className", label: "반", render: (row) => row.className ?? "-" },
    { key: "guardianPhone", label: "보호자 연락처", render: (row) => row.guardianPhone ?? "-" },
    {
      key: "guardianCount",
      label: "보호자 연결",
      render: (row) => (row.guardianCount > 0 ? `연결 ${row.guardianCount}명` : "미연결"),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            setWithdrawing(row);
          }}
        >
          퇴원
        </Button>
      ),
    },
  ];

  return (
    <StyledStudentLayout>
      <PageHeader
        title="학생 관리"
        description={`총 ${totalCount}명`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
            학생 등록
          </Button>
        }
      />

      <StyledStudentToolbar>
        <SearchField placeholder="이름으로 검색" onSubmit={handleSearch} />
      </StyledStudentToolbar>

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable
          columns={columns}
          loading={loading}
          rows={items}
          getRowKey={(row) => row.studentId}
          onRowClick={(row) => setEditingId(row.studentId)}
        />
      </Card>

      <Pagination page={page} size={PAGE_SIZE} totalCount={totalCount} hasNext={hasNext} onPageChange={setPage} />

      {editingId ? (
        <StudentForm studentId={editingId} onClose={() => setEditingId(undefined)} onDone={handleDone} />
      ) : null}
      {creating ? <StudentForm onClose={() => setCreating(false)} onDone={handleDone} /> : null}
      {withdrawing ? (
        <StudentWithdrawDialog student={withdrawing} onClose={() => setWithdrawing(undefined)} onDone={handleDone} />
      ) : null}
    </StyledStudentLayout>
  );
};
