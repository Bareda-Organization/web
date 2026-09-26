"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog } from "@/shared/ui";
import { cancelRun } from "../api";

type RunCancelDialogProps = {
  runId: string;
  onCancel: () => void;
  onCanceled: () => void;
};

// §5.10 DELETE /staff/runs/{id}(SCH-03) — "행을 지우지 않고 canceled_at 을 채운다"
// (실측 확인, api/index.ts 주석). 404 RUN_NOT_FOUND 는 존재 비노출(Ruling 163,
// emergency·route 와 같은 전례) — ApiError.message 그대로 보여준다.
export const RunCancelDialog = ({ runId, onCancel, onCanceled }: RunCancelDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await cancelRun(runId);
      onCanceled();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "회차 취소에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title="회차 취소"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            닫기
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "취소 중..." : "회차 취소"}
          </Button>
        </>
      }
    >
      <p>이 회차를 취소합니다. 행이 삭제되지 않고 취소 표시만 남아 기록은 그대로 유지됩니다.</p>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
