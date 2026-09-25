"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog } from "@/shared/ui";
import { resetAccountPassword } from "../api";
import type { AccountPasswordResetResponseTypes } from "../types";

type AccountPasswordResetDialogProps = {
  accountId: string;
  name: string;
  onClose: () => void;
};

// §5.22 관리자 경유 비밀번호 초기화(AUTH-08 · Ruling 329) — SMS 연동 전까지 학부모·학생·매니저가
// 비밀번호를 되찾는 유일한 경로다. 임시 비밀번호는 이 창에서 한 번만 보이고 다시 조회할 수 없다.
export const AccountPasswordResetDialog = ({ accountId, name, onClose }: AccountPasswordResetDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AccountPasswordResetResponseTypes | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      setResult(await resetAccountPassword(accountId));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "비밀번호 초기화에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title="비밀번호 초기화"
      onClose={onClose}
      footer={
        result ? (
          <Button variant="primary" onClick={onClose}>
            닫기
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "초기화 중..." : "초기화"}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <>
          <p>
            아이디 <strong>{result.loginId}</strong>
          </p>
          <p>
            임시 비밀번호 <strong>{result.temporaryPassword}</strong>
          </p>
          <p>이 창을 닫으면 다시 볼 수 없습니다. 본인에게 전달하고 로그인 후 비밀번호를 바꾸도록 안내해 주세요.</p>
        </>
      ) : (
        <p>{name} 님의 비밀번호를 임시 비밀번호로 바꿀까요? 지금 로그인된 기기는 모두 로그아웃됩니다.</p>
      )}
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
