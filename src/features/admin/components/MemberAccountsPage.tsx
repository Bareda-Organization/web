"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Card, PageHeader, RosterTable } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getStaffAccounts } from "../api";
import type { StaffAccountItemResponseTypes } from "../types";
import { MemberAccountFormDialog } from "./MemberAccountFormDialog";
import { StyledMemberAccountsLayout } from "./MemberAccountsPage.styled";

// §6.6~§6.7 관계자 계정 관리(O-02). 목록에 academyName 열을 둔다 — 메인 관리자만
// 여러 학원의 계정을 한 화면에서 다루므로 이 열이 없으면 어느 학원 소속인지 알 수 없다.
export const MemberAccountsPage = () => {
  const [accounts, setAccounts] = useState<StaffAccountItemResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<StaffAccountItemResponseTypes | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStaffAccounts();
      setAccounts(data.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "관계자 계정 목록을 불러오지 못했습니다");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const columns: RosterColumn<StaffAccountItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "loginId", label: "아이디" },
    { key: "phone", label: "연락처" },
    { key: "academyName", label: "소속 학원" },
    { key: "lastLoginAt", label: "최근 로그인", render: (row) => row.lastLoginAt ?? "기록 없음" },
    {
      key: "status",
      label: "재직 상태",
      render: (row) => (
        <Badge tone={row.status === "active" ? "added" : "neutral"}>
          {row.status === "active" ? "재직 중" : "재직 해제"}
        </Badge>
      ),
    },
    {
      key: "action",
      label: "",
      render: (row) => (
        <Button variant="secondary" onClick={() => setTarget(row)}>
          관리
        </Button>
      ),
    },
  ];

  return (
    <StyledMemberAccountsLayout>
      <PageHeader title="관계자 계정 관리" description={`전체 ${accounts.length}개 계정`} />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        <RosterTable columns={columns} loading={loading} rows={accounts} getRowKey={(row) => row.accountId} />
      </Card>

      {target ? (
        <MemberAccountFormDialog
          account={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            load();
          }}
        />
      ) : null}
    </StyledMemberAccountsLayout>
  );
};
