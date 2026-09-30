"use client";

import { useState } from "react";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Dialog } from "@/shared/ui";
import { unblockAccount } from "../api";
import type { BlockedAccountItemResponseTypes } from "../types";
import { StyledUnblockConfirmBody, StyledUnblockConfirmRow } from "./BlockedAccountsPage.styled";

type UnblockConfirmDialogProps = {
  account: BlockedAccountItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// §6.12 POST /admin/blocked-accounts/{id}/unblock (O-03). BRIEF-a1.md §4.2 — 차단 사유·
// 실패 횟수를 목록에서 이미 보여줬어도, 해제는 계정을 다시 로그인 가능하게 만드는 조작이라
// 그 맥락을 확인 단계에서 한 번 더 보여준 뒤 명시적으로 확정하게 한다.
export const UnblockConfirmDialog = ({ account, onClose, onDone }: UnblockConfirmDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await unblockAccount(account.accountId);
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "차단 해제에 실패했습니다");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={`${account.name} 계정 차단 해제`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "해제 중..." : "차단 해제"}
          </Button>
        </>
      }
    >
      <StyledUnblockConfirmBody>
        <Badge tone="neutral">{account.academyName}</Badge>
        <StyledUnblockConfirmRow>
          <span>아이디</span>
          <span>{account.loginId}</span>
        </StyledUnblockConfirmRow>
        <StyledUnblockConfirmRow>
          <span>차단 시각</span>
          <span>{formatDateTime(account.blockedAt)}</span>
        </StyledUnblockConfirmRow>
        <StyledUnblockConfirmRow>
          <span>로그인 실패 횟수</span>
          <span>{account.failedAttempts}회</span>
        </StyledUnblockConfirmRow>
        <StyledUnblockConfirmRow>
          <span>차단 사유</span>
          <span>{account.reason}</span>
        </StyledUnblockConfirmRow>
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledUnblockConfirmBody>
    </Dialog>
  );
};
