"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, Textarea } from "@/shared/ui";
import { decideSignupRequest } from "../api";
import type { SignupRequestItemResponseTypes } from "../types";
import { StyledDialogForm } from "./SignupDecideDialog.styled";

type SignupDecideDialogProps = {
  request: SignupRequestItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

const needsStudentLink = (role: SignupRequestItemResponseTypes["role"]) => role === "parent" || role === "student";
const needsManagerLink = (role: SignupRequestItemResponseTypes["role"]) => role === "driver" || role === "escort";

// §5.2 POST /staff/signup-requests/{id}/decide(A-02). 수락 시 계정↔레코드 연결이
// 필수라(§5.2, 누락하면 422 LINK_REQUIRED) role 에 따라 studentIds 또는 managerId 를
// 받는다. 학생·매니저 검색 UI 는 다른 기능(run·student)의 목록 API 가 필요해
// feature 간 import 금지 규칙(`CONVENTIONS.md` "지켜야 할 의존 방향")에 걸리므로,
// 이 라운드에서는 ID 직접 입력으로 좁혀 둔다(판단 근거, 보고서 §1).
export const SignupDecideDialog = ({ request, onClose, onDone }: SignupDecideDialogProps) => {
  const [studentIdsInput, setStudentIdsInput] = useState("");
  const [managerIdInput, setManagerIdInput] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [mode, setMode] = useState<"accept" | "reject" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseStudentIds = (): number[] =>
    studentIdsInput
      .split(/[,\s]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map(Number);

  const canAccept = needsStudentLink(request.role)
    ? parseStudentIds().length > 0
    : needsManagerLink(request.role)
      ? managerIdInput.trim().length > 0
      : true;

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await decideSignupRequest(request.requestId, {
        accept: true,
        link: needsStudentLink(request.role)
          ? { studentIds: parseStudentIds() }
          : needsManagerLink(request.role)
            ? { managerId: Number(managerIdInput) }
            : undefined,
      });
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
      await decideSignupRequest(request.requestId, { accept: false, rejectReason: rejectReason.trim() });
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
        ) : mode === "accept" ? (
          <>
            <Button variant="ghost" onClick={() => setMode(null)} disabled={submitting}>
              뒤로
            </Button>
            <Button variant="primary" onClick={handleAccept} disabled={submitting || !canAccept}>
              {submitting ? "처리 중..." : "승인 확정"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              닫기
            </Button>
            <Button variant="danger" onClick={() => setMode("reject")}>
              거절
            </Button>
            <Button variant="primary" onClick={() => setMode("accept")}>
              승인
            </Button>
          </>
        )
      }
    >
      <StyledDialogForm>
        <p>
          {request.role} · {request.phone}
        </p>
        {mode === "accept" && needsStudentLink(request.role) ? (
          <Input
            label="연결할 학생 ID (쉼표로 구분)"
            required
            value={studentIdsInput}
            onChange={(event) => setStudentIdsInput(event.target.value)}
            hint="다자녀는 여러 ID 를 함께 입력합니다"
          />
        ) : null}
        {mode === "accept" && needsManagerLink(request.role) ? (
          <Input
            label="연결할 매니저 ID"
            required
            value={managerIdInput}
            onChange={(event) => setManagerIdInput(event.target.value)}
          />
        ) : null}
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
