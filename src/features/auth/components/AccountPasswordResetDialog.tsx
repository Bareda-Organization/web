"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, StatusChip } from "@/shared/ui";
import { resetAccountPassword } from "../api";
import type { AccountPasswordResetResponseTypes } from "../types";
import { StyledResetKvList } from "./AccountPasswordResetDialog.styled";

type AccountPasswordResetDialogProps = {
  accountId: string;
  name: string;
  /** 대상의 역할 이름(기사 · 동승자 …) — 제목과 본문에 붙인다. 안 주면 이름만 쓴다 */
  roleLabel?: string;
  /** 본문에 괄호로 함께 보일 연락처 — 같은 이름을 가른다 */
  phone?: string;
  onClose: () => void;
};

// §5.22 관리자 경유 비밀번호 초기화(AUTH-08 · Ruling 329) — SMS 연동 전까지 학부모·학생·매니저가
// 비밀번호를 되찾는 유일한 경로다. 임시 비밀번호는 이 창에서 한 번만 보이고 다시 조회할 수 없다.
// 확인 대화상자(Ruling 828 D5) — 초기화하면 무슨 일이 생기는지(첫 로그인 변경 · 기존 비밀번호 즉시 사용 불가)를 실행 전에 보인다.
export const AccountPasswordResetDialog = ({ accountId, name, roleLabel, phone, onClose }: AccountPasswordResetDialogProps) => {
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

  const who = roleLabel ? `${name} ${roleLabel}` : name;

  return (
    <Dialog
      title={`${who} 비밀번호 초기화`}
      // 결과 화면은 푸터 [닫기] 가 있으니 × 를 겹쳐 두지 않는다.
      showClose={!result}
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
            <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "초기화 중..." : "비밀번호 초기화"}
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
        <>
          <p>
            <b>{name}</b>
            {roleLabel ? ` ${roleLabel}` : " 님"}
            {phone ? `(${phone})` : ""}의 비밀번호를 초기화할까요?
          </p>
          <StyledResetKvList aria-label="초기화 영향">
            <div>
              <dt>초기화하면</dt>
              <dd>임시 비밀번호가 한 번만 표시되고, 첫 로그인에서 새 비밀번호로 바꿔야 합니다</dd>
            </div>
            <div>
              <dt>지금 쓰는 비밀번호</dt>
              <dd>
                <StatusChip tone="bad" marker={false}>
                  사용 불가
                </StatusChip>{" "}
                초기화하는 즉시 기존 비밀번호로는 로그인할 수 없습니다. 지금 로그인된 기기는 모두 로그아웃됩니다
              </dd>
            </div>
          </StyledResetKvList>
          <p>임시 비밀번호는 화면을 닫으면 다시 볼 수 없습니다 — 본인에게 전달한 뒤 닫아 주세요.</p>
        </>
      )}
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
