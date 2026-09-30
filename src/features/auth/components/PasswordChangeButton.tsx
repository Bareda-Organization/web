"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input } from "@/shared/ui";
import { changePassword } from "../api";
import { useAuthSession } from "../hooks/useAuthSession";

// §2.2 — 비밀번호는 UTF-8 72바이트 이하(BCrypt 한도, 한글 24자). 서버도 같은 기준으로 422 를 낸다.
const PASSWORD_MAX_BYTES = 72;

const validate = (currentPassword: string, newPassword: string, confirmPassword: string): string | null => {
  if (currentPassword === "" || newPassword === "") return "현재 비밀번호와 새 비밀번호를 입력해 주세요.";
  if (new TextEncoder().encode(newPassword).length > PASSWORD_MAX_BYTES) {
    return "새 비밀번호는 한글 24자(영문·숫자 72자) 이하로 입력해 주세요.";
  }
  if (newPassword !== confirmPassword) return "새 비밀번호와 확인이 같지 않습니다.";
  return null;
};

type PasswordChangeDialogProps = { onClose: () => void };

// 성공하면 서버가 이 계정의 refresh 토큰을 전부 무효화하므로(§2.8) 이 기기도 다시 로그인해야 한다 —
// 안내를 보여 준 뒤 [다시 로그인] 에서 로그아웃하고, 세션이 비면 가드가 로그인 화면으로 보낸다.
const PasswordChangeDialog = ({ onClose }: PasswordChangeDialogProps) => {
  const { logout } = useAuthSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRelogin = () => {
    logout().catch((cause: unknown) => console.warn("로그아웃 요청 실패 — 이 기기에서만 로그아웃했다", cause));
  };

  const handleSubmitClick = async () => {
    const invalid = validate(currentPassword, newPassword, confirmPassword);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await changePassword({ currentPassword, newPassword });
      setChanged(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "INVALID_CREDENTIALS") {
        setError("현재 비밀번호가 맞지 않습니다.");
      } else {
        setError(cause instanceof ApiError ? cause.message : "비밀번호를 바꾸지 못했습니다");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title="비밀번호 변경"
      onClose={changed ? handleRelogin : onClose}
      footer={
        changed ? (
          <Button variant="primary" onClick={handleRelogin}>
            다시 로그인
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSubmitClick} disabled={submitting}>
              {submitting ? "변경 중..." : "변경"}
            </Button>
          </>
        )
      }
    >
      {changed ? (
        <p>비밀번호를 바꿨습니다. 보안을 위해 모든 기기에서 로그아웃됐으니 새 비밀번호로 다시 로그인해 주세요.</p>
      ) : (
        <>
          <Input
            label="현재 비밀번호"
            required
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            label="새 비밀번호"
            required
            type="password"
            autoComplete="new-password"
            hint="한글 24자(영문·숫자 72자) 이하"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Input
            label="새 비밀번호 확인"
            required
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {error ? <AlertBanner tone="missed" title={error} /> : null}
        </>
      )}
    </Dialog>
  );
};

/**
 * 본인 비밀번호 변경(AUTH-07, §2.8) — 관계자·메인 관리자 헤더. 관리자가 초기화해 준 임시 비밀번호(§5.22)를
 * 받은 본인이 직접 바꾸는 유일한 길이다(2026-10-01 R46-WEBF, Ruling 491).
 */
export const PasswordChangeButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" icon="key-round" onClick={() => setOpen(true)}>
        비밀번호 변경
      </Button>
      {open ? <PasswordChangeDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
};
