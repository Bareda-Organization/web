import type { ReactNode } from "react";
import { Button } from "../core/Button";
import { Textarea } from "../forms/Textarea";
import { Dialog } from "./Dialog";
import { StyledRejectReasonForm } from "./RejectReasonDialog.styled";

export type RejectReasonDialogProps = {
  open: boolean;
  title: string;
  /** 거절 확정 단추의 이름 — 제목의 동작 이름과 같게("대상 + 동작") 쓴다 */
  confirmLabel: string;
  /** 사유 칸 위의 안내 글 */
  intro?: ReactNode;
  reason: string;
  onReasonChange: (reason: string) => void;
  placeholder?: string;
  /** 사유 칸 아래 안내 — 신청자·학부모에게 그대로 전달됨을 알린다 */
  fieldHint: string;
  maxLength?: number;
  /** 사유가 비어 확정 단추가 꺼져 있을 때만 단추 아래에 보이는 이유 글 */
  emptyHint: string;
  submitting: boolean;
  /** 사유 외의 이유로 확정을 막을 때(예: 처리 기한 경과) */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

// 가입 거절·구간 변경 거절이 같이 쓰는 "사유를 받고 거절" 대화상자 — 사유 칸 + 뒤로/확정 단추 + 처리 중 표시.
// 거절 API 호출·오류 문구·사유 trim 은 호출부가 맡는다.
export const RejectReasonDialog = ({
  open,
  title,
  confirmLabel,
  intro,
  reason,
  onReasonChange,
  placeholder,
  fieldHint,
  maxLength,
  emptyHint,
  submitting,
  confirmDisabled = false,
  onConfirm,
  onClose,
}: RejectReasonDialogProps) => {
  const isEmpty = !reason.trim();
  const field = (
    <Textarea
      label="거절 사유"
      required
      maxLength={maxLength}
      placeholder={placeholder}
      hint={fieldHint}
      value={reason}
      onChange={(event) => onReasonChange(event.target.value)}
    />
  );
  return (
    <Dialog
      open={open}
      title={title}
      showClose
      onClose={onClose}
      actionHint={isEmpty ? emptyHint : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            뒤로
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={submitting || confirmDisabled || isEmpty}>
            {submitting ? "처리 중..." : confirmLabel}
          </Button>
        </>
      }
    >
      {intro ? (
        <StyledRejectReasonForm>
          {intro}
          {field}
        </StyledRejectReasonForm>
      ) : (
        field
      )}
    </Dialog>
  );
};
