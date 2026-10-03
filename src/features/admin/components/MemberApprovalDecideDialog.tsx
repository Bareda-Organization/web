"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Textarea } from "@/shared/ui";
import { decideStaffSignupRequest } from "../api";
import { isStaffQuotaFull } from "../lib/staffQuota";
import type { StaffSignupRequestItemResponseTypes } from "../types";
import { StyledDialogForm } from "./AcademyFormDialog.styled";

type MemberApprovalDecideDialogProps = {
  request: StaffSignupRequestItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// §6.5 POST /admin/staff-signup-requests/{id}/decide (O-02). 학원당 관계자 1명 정원이라
// (STAFF_QUOTA_EXCEEDED) 재직 관계자가 이미 있는 학원은 승인 버튼을 끄고 해결 방법을 알린다 —
// 눌러서야 409 를 보면 왜 안 되는지, 무엇을 해야 하는지 알 수 없다. 거절은 정원과 무관해 그대로 열어 둔다.
// 목록을 연 뒤 다른 관리자가 먼저 승인한 경우는 서버 409 를 아래 오류 배너로 그대로 보여 준다.
const STAFF_QUOTA_FULL_NOTICE =
  "이 학원에는 이미 재직 중인 관계자가 있습니다(학원당 1명). 승인하려면 먼저 계정 관리에서 기존 관계자를 퇴사 처리하세요.";

export const MemberApprovalDecideDialog = ({ request, onClose, onDone }: MemberApprovalDecideDialogProps) => {
  const [mode, setMode] = useState<"accept" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isQuotaFull = isStaffQuotaFull(request.academyStaffCount);

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await decideStaffSignupRequest(request.requestId, { accept: true });
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "승인 처리에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await decideStaffSignupRequest(request.requestId, { accept: false, rejectReason: rejectReason.trim() });
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "거절 처리에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={`${request.name} 가입 요청 처리`}
      onClose={onClose}
      footer={
        mode === "reject" ? (
          <>
            <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
              뒤로
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={submitting || !rejectReason.trim()}>
              {submitting ? "처리 중..." : "거절 확정"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              닫기
            </Button>
            <Button variant="danger" onClick={() => setMode("reject")} disabled={submitting}>
              거절
            </Button>
            <Button variant="primary" onClick={handleAccept} disabled={submitting || isQuotaFull}>
              {submitting ? "처리 중..." : "승인"}
            </Button>
          </>
        )
      }
    >
      <StyledDialogForm>
        <p>
          {request.academy.name} ({request.academy.region}) · 현재 관계자 {request.academyStaffCount}명 · {request.phone}
        </p>
        {mode === "reject" ? (
          <Textarea
            label="거절 사유"
            required
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        ) : null}
        {isQuotaFull ? (
          <AlertBanner tone="moving" title={STAFF_QUOTA_FULL_NOTICE} action={<Link href="/member-accounts">계정 관리로 이동</Link>} />
        ) : null}
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledDialogForm>
    </Dialog>
  );
};
