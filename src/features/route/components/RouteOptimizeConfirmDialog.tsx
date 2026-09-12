"use client";

import { Button, Dialog } from "@/shared/ui";

type RouteOptimizeConfirmDialogProps = {
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
};

// §5.9 POST /staff/routes/{id}/optimize(RTE-09) 에는 waypoints(§5.15)와 달리
// apply=false 미리보기가 없다 — 호출 즉시 기존 수동 정차 순서를 버리고 커밋한다.
// 되돌릴 수단이 없는 조작이라, ForcedAddDialog(run 기능)의 2단계 확인 관례를 그대로
// 가져와 이 한 단계만 확인 절차로 세운다(§2 판단 근거 — 사양 자체엔 확인 단계 지시가 없음).
export const RouteOptimizeConfirmDialog = ({ onCancel, onConfirm, submitting }: RouteOptimizeConfirmDialogProps) => (
  <Dialog
    title="정차 순서 최적화"
    onClose={onCancel}
    footer={
      <>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          다시 확인
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={submitting}>
          {submitting ? "최적화 중..." : "확정하고 최적화"}
        </Button>
      </>
    }
  >
    <p>지금까지 정한 정차 순서를 버리고 새로 계산합니다. 이 조작은 되돌릴 수 없습니다.</p>
  </Dialog>
);
