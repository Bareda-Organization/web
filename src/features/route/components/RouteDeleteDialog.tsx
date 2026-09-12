"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog } from "@/shared/ui";
import { deleteRoute } from "../api";

type RouteDeleteDialogProps = {
  routeId: number;
  onCancel: () => void;
  onDeleted: () => void;
};

// §5.9 DELETE /staff/routes/{id} — "행을 지운다(soft delete 부재)" 이고 정차 순서도
// route_stop FK CASCADE 로 함께 사라진다. 참조 잠금 409 는 사양에 없다(manager 의
// 409 MANAGER_ASSIGNED 와 다른 경우) — 그래도 되돌릴 수 없는 하드 삭제라 확인창을 둔다.
export const RouteDeleteDialog = ({ routeId, onCancel, onDeleted }: RouteDeleteDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteRoute(routeId);
      onDeleted();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "편성 삭제에 실패했습니다");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title="노선 편성 삭제"
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
      <p>이 편성과 정차 순서가 모두 사라집니다. 이 작업은 되돌릴 수 없습니다.</p>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
