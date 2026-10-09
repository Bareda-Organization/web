"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, useToast } from "@/shared/ui";
import { DefinitionList } from "@/shared/ui/display";
import { formatRole } from "@/shared/lib/format/roleLabel";
import { unblockAccount } from "../api";
import { academyDotColor, eventTimeCell } from "../lib/relativeTime";
import type { BlockedAccountItemResponseTypes } from "../types";
import { StyledAcademyCell, StyledAcademyDot } from "./BlockedAccountsPage.styled";

type UnblockConfirmDialogProps = {
  account: BlockedAccountItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// 차단 직전 상태 이름 — 해제하면 이 상태로 돌아간다(§6.12 · Ruling 328).
const STATUS_LABEL = { active: "활성", pending: "승인 대기", rejected: "거절됨" } as const;

// 가입 승인 주체 — 관계자 가입은 메인 관리자가, 그 밖의 역할은 소속 학원 관계자가 승인한다(AUTH-10 · O-02).
const approverOf = (account: BlockedAccountItemResponseTypes): string => (account.role === "staff" ? "메인 관리자" : `${account.academyName} 관계자`);

// 해제 뒤 상태에 따른 안내 — 승인 대기 · 거절됨도 로그인은 성공하고 대기 화면에만 고정된다(API_SPEC §1.4). 활성은 바로 모든 화면을 쓴다.
const afterNotice = (account: BlockedAccountItemResponseTypes) => {
  const status = STATUS_LABEL[account.statusBeforeBlock];
  if (account.statusBeforeBlock === "pending") {
    const approver = approverOf(account);
    return {
      tone: "moving" as const,
      body: `이 계정은 차단되기 전에 가입 승인을 기다리던 중이었습니다. 해제하면 로그인은 되지만, ${approver}가 승인하기 전에는 승인 대기 화면만 열립니다.`,
      toast: `'${status}' 상태로 돌아갔습니다 — ${approver}의 승인을 받기 전에는 승인 대기 화면만 열립니다. 처리자와 일시가 이력에 남았습니다.`,
    };
  }
  if (account.statusBeforeBlock === "rejected") {
    return {
      tone: "moving" as const,
      body: "이 계정은 차단되기 전에 가입이 거절된 상태였습니다. 해제하면 로그인은 되지만, 거절 상태 그대로라 가입 거절 안내 화면만 열립니다.",
      toast: `'${status}' 상태로 돌아갔습니다 — 거절 상태 그대로라 가입 거절 안내 화면만 열립니다. 처리자와 일시가 이력에 남았습니다.`,
    };
  }
  return {
    tone: "info" as const,
    body: "해제하면 이 계정은 바로 다시 로그인할 수 있습니다.",
    toast: `'${status}' 상태로 돌아갔습니다 — 지금부터 로그인할 수 있습니다. 처리자와 일시가 이력에 남았습니다.`,
  };
};

// §6.12 POST /admin/blocked-accounts/{id}/unblock (O-03). BRIEF-a1.md §4.2 — 차단 사유·
// 실패 횟수를 목록에서 이미 보여줬어도, 해제는 계정을 다시 로그인 가능하게 만드는 조작이라
// 그 맥락을 확인 단계에서 한 번 더 보여준 뒤 명시적으로 확정하게 한다.
export const UnblockConfirmDialog = ({ account, onClose, onDone }: UnblockConfirmDialogProps) => {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const time = eventTimeCell(account.blockedAt);
  const notice = afterNotice(account);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await unblockAccount(account.accountId);
      toast.show({ title: `${account.name} 계정의 로그인 차단을 해제했습니다`, detail: notice.toast, durationMs: 6000 });
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "차단 해제에 실패했습니다");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={`${account.name} 계정 차단 해제`}
      showClose
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" icon="lock-open" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "해제 중..." : "차단 해제"}
          </Button>
        </>
      }
    >
      <DefinitionList
        items={[
          {
            term: "계정",
            value: (
              <>
                <b>{account.name}</b> <small style={{ fontWeight: 400 }}>{account.loginId} · {formatRole(account.role)}</small>
              </>
            ),
          },
          {
            term: "소속 학원",
            value: (
              <StyledAcademyCell>
                <StyledAcademyDot $color={academyDotColor(account.academyName)} aria-hidden="true" />
                {account.academyName}
              </StyledAcademyCell>
            ),
          },
          {
            term: "차단 시각",
            value: (
              <>
                {time.main} <small style={{ fontWeight: 400 }}>({time.sub})</small>
              </>
            ),
          },
          { term: "실패 횟수", value: `${account.failedAttempts}회` },
          { term: "차단 사유", value: account.reason },
        ]}
      />
      <div style={{ marginTop: 16 }}>
        <AlertBanner tone={notice.tone} title={`해제 뒤 상태 — ${STATUS_LABEL[account.statusBeforeBlock]}`}>
          {notice.body}
        </AlertBanner>
      </div>
      {error ? (
        <div style={{ marginTop: 12 }}>
          <AlertBanner tone="missed" title={error} />
        </div>
      ) : null}
    </Dialog>
  );
};
