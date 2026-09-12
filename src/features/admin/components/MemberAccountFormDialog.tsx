"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Dialog, Input } from "@/shared/ui";
import { updateStaffAccount } from "../api";
import type { StaffAccountItemResponseTypes } from "../types";
import { StyledDialogForm } from "./AcademyFormDialog.styled";

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

  const handleSaveInfo = async () => {
    setSubmitting("info");
    setError(null);
    try {
      await updateStaffAccount(account.accountId, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      });
      setRefreshedAfterAction(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "정보 수정에 실패했습니다");
    } finally {
      setSubmitting(null);
    }
  };

  const handleResetPassword = async () => {
    setSubmitting("password");
    setError(null);
    try {
      const result = await updateStaffAccount(account.accountId, { resetPassword: true });
      setTemporaryPassword(result.temporaryPassword ?? null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "비밀번호 초기화에 실패했습니다");
    } finally {
      setSubmitting(null);
    }
  };

  const nextStatus = account.status === "active" ? "inactive" : "active";

  const handleToggleStatus = async () => {
    setSubmitting("status");
    setError(null);
    try {
      await updateStaffAccount(account.accountId, { status: nextStatus });
      setRefreshedAfterAction(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "재직 상태 변경에 실패했습니다");
    } finally {
      setSubmitting(null);
    }
  };

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
            variant={account.status === "active" ? "danger" : "primary"}
            onClick={handleToggleStatus}
            disabled={submitting !== null}
          >
            {submitting === "status" ? "처리 중..." : account.status === "active" ? "재직 해제" : "재직 전환"}
          </Button>
          <Button variant="primary" onClick={handleSaveInfo} disabled={submitting !== null}>
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
        <Button variant="secondary" onClick={handleResetPassword} disabled={submitting !== null}>
          {submitting === "password" ? "초기화 중..." : "비밀번호 초기화"}
        </Button>
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
