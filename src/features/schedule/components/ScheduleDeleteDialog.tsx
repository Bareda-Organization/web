"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog } from "@/shared/ui";
import { deleteSchedule } from "../api";

type ScheduleDeleteDialogProps = {
  scheduleId: number;
  onCancel: () => void;
  onDeleted: () => void;
};

// §5.10 DELETE /staff/schedules/{id} — "행을 지운다(soft delete 부재)". 이미 만들어진
// 회차는 schedule_id 가 NULL 로 남아 그대로 유지된다(ERD FK SET NULL) — 삭제해도
// 과거·확정된 운행 기록이 사라지지 않는다는 점을 확인창 문구에 명시한다.
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
      <p>이 스케줄은 다음 회차 생성부터 제외됩니다. 이미 만들어진 회차는 그대로 남습니다.</p>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
