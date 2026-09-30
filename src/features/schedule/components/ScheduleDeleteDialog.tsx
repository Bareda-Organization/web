"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog } from "@/shared/ui";
import { deleteSchedule } from "../api";

type ScheduleDeleteDialogProps = {
  scheduleId: string;
  onCancel: () => void;
  onDeleted: () => void;
};

// §5.10 DELETE /staff/schedules/{id} — "행을 지운다(soft delete 부재)". 만들어진 회차 행은
// 지워지지 않고(ERD FK SET NULL) 과거·확정된 운행 기록이 남는다. 다만 Ruling 366 ② 로 삭제 전에
// 내일 이후 · idle · 미취소 회차는 취소 표시되므로 확인창이 그 결과를 알린다(오늘 회차는 그대로).
export const ScheduleDeleteDialog = ({ scheduleId, onCancel, onDeleted }: ScheduleDeleteDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteSchedule(scheduleId);
      onDeleted();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "스케줄 삭제에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title="운행 스케줄 삭제"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "삭제 중..." : "삭제"}
          </Button>
        </>
      }
    >
      <p>이 스케줄은 다음 회차 생성부터 제외되고, 내일 이후 시작 전 회차는 취소 표시됩니다(오늘 회차와 이미 확정·시작된 회차는 그대로).</p>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
