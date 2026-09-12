"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Textarea } from "@/shared/ui";
import { decideStaffSignupRequest } from "../api";
import type { StaffSignupRequestItemResponseTypes } from "../types";
import { StyledDialogForm } from "./AcademyFormDialog.styled";

type MemberApprovalDecideDialogProps = {
  request: StaffSignupRequestItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// §6.5 POST /admin/staff-signup-requests/{id}/decide (O-02). 학원당 관계자 1명 정원이라
// (STAFF_QUOTA_EXCEEDED) 목록에 academyStaffCount 를 함께 보여 준다 — 승인 전에 이미
// 꽉 찬 학원인지 알 수 있어야 한다(판단 근거, 보고서 §1).
export const MemberApprovalDecideDialog = ({ request, onClose, onDone }: MemberApprovalDecideDialogProps) => {
  const [mode, setMode] = useState<"accept" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            <Button variant="primary" onClick={handleAccept} disabled={submitting}>
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
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledDialogForm>
    </Dialog>
  );
};
