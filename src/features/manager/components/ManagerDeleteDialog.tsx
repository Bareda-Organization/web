"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog } from "@/shared/ui";
import { deleteManager } from "../api";
import type { ManagerItemResponseTypes } from "../types";

type ManagerDeleteDialogProps = {
  manager: ManagerItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// §5.13 DELETE /staff/managers/{id}(MGR-04) — 이 화면의 본체는 참조가 걸린 자원을
// 지우려 할 때다: 회차에 배치된 매니저를 지우면 409 MANAGER_ASSIGNED 가 온다.
// 그 경우 "삭제 실패"로 뭉개지 않고 배치를 먼저 풀어야 한다는 다음 행동을 그대로 안내한다.
export const ManagerDeleteDialog = ({ manager, onClose, onDone }: ManagerDeleteDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteManager(manager.id);
      onDone();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "MANAGER_ASSIGNED") {
        setError("현재 배치된 회차가 있어 삭제할 수 없습니다. 배치를 먼저 해제해 주세요.");
      } else {
        setError(cause instanceof ApiError ? cause.message : "매니저 삭제에 실패했습니다");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title="매니저 삭제"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "삭제 중..." : "삭제"}
          </Button>
        </>
      }
    >
      <p>{manager.name} 매니저를 삭제할까요?</p>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
