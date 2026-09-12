"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, EmptyState, PageHeader, RosterTable } from "@/shared/ui";
import type { RosterColumn } from "@/shared/types";
import { getBlockedAccounts } from "../api";
import type { BlockedAccountItemResponseTypes } from "../types";
import { UnblockConfirmDialog } from "./UnblockConfirmDialog";
import { StyledBlockedAccountsLayout } from "./BlockedAccountsPage.styled";

// §6.10·§6.12 차단 계정 해제(O-03). BRIEF-a1.md §4.2 대로 failedAttempts·reason 열을
// 목록에 그대로 두고, 확인 다이얼로그에서 같은 정보를 한 번 더 보여준다.
export const BlockedAccountsPage = () => {
  const [accounts, setAccounts] = useState<BlockedAccountItemResponseTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<BlockedAccountItemResponseTypes | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBlockedAccounts();
      setAccounts(data.items);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "차단 계정 목록을 불러오지 못했습니다");
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

  const columns: RosterColumn<BlockedAccountItemResponseTypes>[] = [
    { key: "name", label: "이름" },
    { key: "loginId", label: "아이디" },
    { key: "academyName", label: "소속 학원" },
    { key: "blockedAt", label: "차단 시각" },
    { key: "failedAttempts", label: "실패 횟수", render: (row) => `${row.failedAttempts}회` },
    { key: "reason", label: "사유" },
    {
      key: "action",
      label: "",
      render: (row) => (
        <Button variant="secondary" onClick={() => setTarget(row)}>
          차단 해제
        </Button>
      ),
    },
  ];

  return (
    <StyledBlockedAccountsLayout>
      <PageHeader title="차단 계정 해제" description={`현재 차단된 계정 ${accounts.length}건`} />

      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <Card padding={0} aria-busy={loading}>
        {!loading && accounts.length === 0 ? (
          <EmptyState icon="shield-check" title="차단된 계정이 없습니다" />
        ) : (
          <RosterTable columns={columns} rows={accounts} getRowKey={(row) => row.accountId} />
        )}
      </Card>

      {target ? (
        <UnblockConfirmDialog
          account={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            load();
          }}
        />
      ) : null}
    </StyledBlockedAccountsLayout>
  );
};
