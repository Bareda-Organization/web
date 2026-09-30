"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Dialog, Input } from "@/shared/ui";
import { updateStaffAccount } from "../api";
import type { StaffAccountItemResponseTypes } from "../types";
import { StyledDialogForm } from "./AcademyFormDialog.styled";

// §1.9 — 서버 2xx 확인 뒤에만 "처리되었습니다" 를 보인다.
const DONE_NOTICE = "처리되었습니다";

type MemberAccountFormDialogProps = {
  account: StaffAccountItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// §6.7 PATCH /admin/staff-accounts/{id} (O-02). 세 동작(정보 수정 · 비밀번호 초기화 ·
// 재직 상태 전환)을 버튼 3개로 분리했다 — 한 폼에 섞으면 "이름만 고치려 했는데
// 비밀번호도 같이 바뀌었다" 는 사고가 나기 쉽다(판단 근거, 보고서 §1).
export const MemberAccountFormDialog = ({ account, onClose, onDone }: MemberAccountFormDialogProps) => {
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone);
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState<"info" | "password" | "status" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [refreshedAfterAction, setRefreshedAfterAction] = useState(false);
  // 재직 상태는 서버 확인 뒤 이 창 안에서도 바뀐다 — props 그대로 두면 방금 해제한 계정에 또 해제를 보낸다.
  const [status, setStatus] = useState(account.status);
  const [notice, setNotice] = useState<string | null>(null);
  // 되돌릴 수 없는 조작(재직 해제·비밀번호 초기화)은 확인 한 단계를 거친다.
  const [confirming, setConfirming] = useState<"status" | "password" | null>(null);

  const canSaveInfo = name.trim().length > 0 && phone.trim().length > 0;

  const handleSaveInfo = async () => {
    setSubmitting("info");
    setError(null);
    setNotice(null);
    try {
      await updateStaffAccount(account.accountId, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      });
      setRefreshedAfterAction(true);
      setNotice(DONE_NOTICE);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "정보 수정에 실패했습니다");
    } finally {
      setSubmitting(null);
    }
  };

  const handleResetPassword = async () => {
    setConfirming(null);
    setSubmitting("password");
    setError(null);
    setNotice(null);
    try {
      const result = await updateStaffAccount(account.accountId, { resetPassword: true });
      setTemporaryPassword(result.temporaryPassword ?? null);
      setNotice(DONE_NOTICE);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "비밀번호 초기화에 실패했습니다");
    } finally {
      setSubmitting(null);
    }
  };

  const nextStatus = status === "active" ? "inactive" : "active";

  const handleToggleStatus = async () => {
    setConfirming(null);
    setSubmitting("status");
    setError(null);
    setNotice(null);
    try {
      await updateStaffAccount(account.accountId, { status: nextStatus });
      setStatus(nextStatus);
      setRefreshedAfterAction(true);
      setNotice(DONE_NOTICE);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "재직 상태 변경에 실패했습니다");
    } finally {
      setSubmitting(null);
    }
  };

  if (confirming) {
    const isStatus = confirming === "status";
    return (
      <Dialog
        title={isStatus ? "재직을 해제할까요?" : "비밀번호를 초기화할까요?"}
        onClose={() => setConfirming(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              취소
            </Button>
            <Button variant="danger" onClick={isStatus ? handleToggleStatus : handleResetPassword}>
              {isStatus ? "해제 확정" : "초기화 확정"}
            </Button>
          </>
        }
      >
        {isStatus
          ? `${account.name} 님은 지금부터 로그인할 수 없게 됩니다. 다시 재직으로 전환하기 전까지 유지됩니다.`
          : `${account.name} 님의 비밀번호가 임시 비밀번호로 바뀝니다. 임시 비밀번호는 이 창을 닫으면 다시 볼 수 없습니다.`}
      </Dialog>
    );
  }

  return (
    <Dialog
      title={`${account.name} 계정 관리`}
      onClose={refreshedAfterAction ? onDone : onClose}
      footer={
        <>
          <Button variant="ghost" onClick={refreshedAfterAction ? onDone : onClose}>
            닫기
          </Button>
          <Button
            variant={status === "active" ? "danger" : "primary"}
            onClick={status === "active" ? () => setConfirming("status") : handleToggleStatus}
            disabled={submitting !== null}
          >
            {submitting === "status" ? "처리 중..." : status === "active" ? "재직 해제" : "재직 전환"}
          </Button>
          <Button variant="primary" onClick={handleSaveInfo} disabled={submitting !== null || !canSaveInfo}>
            {submitting === "info" ? "저장 중..." : "정보 저장"}
          </Button>
        </>
      }
    >
      <StyledDialogForm>
        <Badge tone="neutral">{account.academyName}</Badge>
        <Input label="아이디" value={account.loginId} disabled />
        <Input label="이름" value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="연락처" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Input
          label="이메일"
          placeholder="변경 시에만 입력"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button variant="secondary" onClick={() => setConfirming("password")} disabled={submitting !== null}>
          {submitting === "password" ? "초기화 중..." : "비밀번호 초기화"}
        </Button>
        {notice ? <AlertBanner tone="boarded" title={notice} /> : null}
        {temporaryPassword ? (
          <AlertBanner tone="info" title="임시 비밀번호가 발급됐습니다">
            {temporaryPassword} — 이 창을 닫으면 다시 볼 수 없습니다.
          </AlertBanner>
        ) : null}
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledDialogForm>
    </Dialog>
  );
};
