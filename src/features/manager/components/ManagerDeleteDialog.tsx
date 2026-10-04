import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, StatusChip } from "@/shared/ui";
import { deleteManager } from "../api";
import type { ManagerItemResponseTypes } from "../types";
import { StyledKvList } from "./ManagerForm.styled";

type ManagerDeleteDialogProps = {
  manager: ManagerItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

const ROLE_LABEL = { driver: "기사", escort: "동승자" } as const;

// §5.13 DELETE /staff/managers/{id}(MGR-04) — 이 화면의 본체는 참조가 걸린 자원을
// 지우려 할 때다: 회차에 배치된 매니저를 지우면 409 MANAGER_ASSIGNED 가 온다.
// 목록의 배치 중 회차 수(`assigned_run_count`)로 먼저 막고 이유를 보이되, 서버가 막으면 그 경계를 그대로 안내한다.
export const ManagerDeleteDialog = ({ manager, onClose, onDone }: ManagerDeleteDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assigned = manager.assignedRunCount;

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
      title={`${manager.name} ${ROLE_LABEL[manager.role]} 삭제`}
      showClose
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting || assigned > 0}>
            {submitting ? "삭제 중..." : "매니저 삭제"}
          </Button>
        </>
      }
    >
      <p>
        <b>{manager.name}</b> {ROLE_LABEL[manager.role]}를 삭제할까요?
      </p>
      <StyledKvList aria-label="삭제 영향">
        <div>
          <dt>배치 현황</dt>
          <dd>
            {assigned > 0 ? <StatusChip tone="bad" marker={false}>삭제 불가</StatusChip> : <StatusChip tone="ok" marker={false}>삭제 가능</StatusChip>}{" "}
            {assigned > 0 ? `배치된 회차가 ${assigned}회 남아 있습니다` : "배치된 회차가 0회입니다"}
          </dd>
        </div>
        <div>
          <dt>삭제되는 것</dt>
          <dd>매니저 목록과 배치 후보에서 빠집니다</dd>
        </div>
      </StyledKvList>
      <p>배치된 회차가 남아 있으면 삭제할 수 없습니다 — 배치를 먼저 해제해 주세요.</p>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
