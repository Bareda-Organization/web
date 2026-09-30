"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog } from "@/shared/ui";
import { deleteTransfer } from "../api";
import type { RosterItemResponseTypes } from "../types";
import { StyledConfirmBody } from "./ForcedAddDialog.styled";

type TransferCancelDialogProps = {
  /** 이동 대기 행 — `transferId` 가 있는 학생 */
  student: RosterItemResponseTypes & { transferId: string };
  onClose: () => void;
  onDone: () => void;
};

// §5.8.1 에러 코드별 문구 — 영문 코드·서버 원문은 화면에 내지 않는다.
const cancelErrorMessage = (cause: unknown): string => {
  if (!(cause instanceof ApiError)) return "이동을 취소하지 못했습니다. 잠시 뒤 다시 시도해 주세요";
  switch (cause.code) {
    case "CHANGE_WINDOW_CLOSED":
      return "이미 확정된 회차가 있어 이동을 취소할 수 없습니다";
    case "TRANSFER_NOT_FOUND":
      return "이미 취소되었거나 찾을 수 없는 이동 기록입니다";
    default:
      return cause.message;
  }
};

// §5.8.1 DELETE /staff/transfers/{transferId}(A-07, Ruling 369) — 저장해 둔 이동 대기를 확정 전에 되돌린다.
// 되돌리면 학생은 원래 버스 명단으로 남고 도착 버스 예정 명단에서 빠지므로 확인 단계를 한 번 거친다.
export const TransferCancelDialog = ({ student, onClose, onDone }: TransferCancelDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteTransfer(student.transferId);
      onDone();
    } catch (cause) {
      setError(cancelErrorMessage(cause));
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={`${student.name} 학생 — 이동 취소`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            돌아가기
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "취소 중..." : "이동 취소하기"}
          </Button>
        </>
      }
    >
      <StyledConfirmBody>
        <p>{student.name} 학생을 다른 버스로 옮기기로 저장한 건을 취소합니다. 학생은 원래 버스 명단에 그대로 남습니다.</p>
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledConfirmBody>
    </Dialog>
  );
};
