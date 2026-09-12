"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Dialog, Textarea } from "@/shared/ui";
import { forceConfirmRun } from "../api";
import type { ForceConfirmResponseTypes, RunLiveItemResponseTypes } from "../types";
import { StyledResultList } from "./ForceConfirmPage.styled";

type ForceConfirmDialogProps = {
  run: RunLiveItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// §6.14, BRIEF-a1.md §4.1 — "확인 단계와 그 결과 표시가 이 화면의 본체". 되돌릴 수 없는
// 동작이라 (1) 사유 입력 없이는 실행 버튼을 활성화하지 않고 (2) 성공한 뒤에는 폼으로
// 되돌아가지 못하게 결과 화면으로 고정한다 — 실수로 두 번 누르는 경로 자체를 없앤다.
export const ForceConfirmDialog = ({ run, onClose, onDone }: ForceConfirmDialogProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForceConfirmResponseTypes | null>(null);

  const reasonIsBlank = reason.trim().length === 0;

  const handleConfirm = async () => {
    if (reasonIsBlank) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await forceConfirmRun(run.runId, reason.trim());
      setResult(data);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "RUN_NOT_IDLE") {
        setError("이미 확정되었거나 대기 상태가 아닌 회차입니다 — 새로고침 후 다시 확인하세요.");
      } else if (cause instanceof ApiError && cause.code === "RUN_NOT_DUE") {
        setError("아직 확정 예정 시각 전이라 강제 확정할 수 없습니다.");
      } else {
        setError(cause instanceof ApiError ? cause.message : "강제 확정에 실패했습니다");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Dialog title="강제 확정 완료" onClose={onDone} footer={<Button onClick={onDone}>닫기</Button>}>
        <AlertBanner tone="boarded" title="폴백 경로로 확정되었습니다">
          이 결과는 되돌릴 수 없습니다. 관계자에게 통지가 이미 발송되었습니다.
        </AlertBanner>
        <StyledResultList>
          <p>회차 ID: {result.runId}</p>
          <p>새 노선 버전 ID: {result.routeVersionId}</p>
          <p>확정 시각: {result.confirmedAt}</p>
          <p>
            <Badge tone="amber">폴백 계산 사용</Badge>
          </p>
        </StyledResultList>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={`${run.busNo} 강제 확정`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting || reasonIsBlank}>
            {submitting ? "실행 중..." : "강제 확정 실행"}
          </Button>
        </>
      }
    >
      <AlertBanner tone="missed" title="되돌릴 수 없는 동작입니다">
        직선거리 폴백 계산으로 즉시 확정되며, 관계자 통지가 곧바로 발송됩니다.
      </AlertBanner>
      <Textarea
        label="강제 확정 사유"
        placeholder="예: 노선 계산이 3회 연속 실패하여 폴백으로 개입"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
