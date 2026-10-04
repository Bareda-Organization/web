"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, StatusChip } from "@/shared/ui";
import { deleteRoute } from "../api";
import { StyledDeleteKv } from "./RouteList.styled";

type RouteDeleteDialogProps = {
  routeId: string;
  /** "1호차 · 금 · 하원" — 제목과 본문에 쓴다 */
  label?: string;
  stopCount?: number;
  /** 이용 학생 수(서버가 정차지별 값을 주면) */
  riderCount?: number;
  onCancel: () => void;
  onDeleted: () => void;
};

// §5.9 DELETE /staff/routes/{id} — "행을 지운다(soft delete 부재)" 이고 정차 순서도
// route_stop FK CASCADE 로 함께 사라진다. 참조 잠금 409 는 사양에 없다(manager 의
// 409 MANAGER_ASSIGNED 와 다른 경우) — 그래도 되돌릴 수 없는 하드 삭제라 확인창을 둔다.
export const RouteDeleteDialog = ({ routeId, label, stopCount, riderCount, onCancel, onDeleted }: RouteDeleteDialogProps) => {
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
      title={label ? `${label} 편성 삭제` : "노선 편성 삭제"}
      showClose
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "삭제 중..." : "편성 삭제"}
          </Button>
        </>
      }
    >
      {label ? (
        <p>
          <b>{label}</b> 편성을 삭제할까요?
        </p>
      ) : null}
      <StyledDeleteKv aria-label="삭제 영향">
        <div>
          <dt>삭제되는 것</dt>
          <dd>
            <StatusChip tone="bad" marker={false}>
              편성 삭제
            </StatusChip>{" "}
            {stopCount !== undefined ? `승하차지 ${stopCount}곳의 순서${riderCount !== undefined ? `와 이용 학생 ${riderCount}명의 배치` : ""}` : "이 편성과 정차 순서가 모두 사라집니다"}
          </dd>
        </div>
        <div>
          <dt>그대로인 것</dt>
          <dd>이미 만들어진 확정 노선 — 확정 노선은 출발 30분 전에 따로 계산되어 이 편성과 별개입니다</dd>
        </div>
      </StyledDeleteKv>
      <p>이 작업은 되돌릴 수 없습니다. 다시 쓰려면 편성을 새로 만들어야 합니다.</p>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
