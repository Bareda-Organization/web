"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, SegmentedControl } from "@/shared/ui";
import { postForcedAdd } from "../api";
import { StyledDialogForm, StyledConfirmBody } from "./ForcedAddDialog.styled";

type Mode = "existing" | "new";

type ForcedAddDialogProps = {
  runId: number;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

// §5.7 POST /staff/runs/{runId}/forced-add(A-07) — 되돌릴 수 없는 조작이라(BRIEF §3-3)
// 입력 단계와 별개로 확정 단계를 하나 더 둔다. student_id·new_student.name 은
// 배타적이라(§5.7) 라디오로 갈라 한쪽만 서버에 보낸다.
export const ForcedAddDialog = ({ runId, open, onClose, onDone }: ForcedAddDialogProps) => {
  const [mode, setMode] = useState<Mode>("existing");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMode("existing");
    setStudentIdInput("");
    setNewStudentName("");
    setAddress("");
    setNote("");
    setConfirming(false);
    setSubmitting(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canSubmit =
    address.trim().length > 0 &&
    (mode === "existing" ? studentIdInput.trim().length > 0 : newStudentName.trim().length > 0);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await postForcedAdd(runId, {
        studentId: mode === "existing" ? Number(studentIdInput) : undefined,
        newStudentName: mode === "new" ? newStudentName.trim() : undefined,
        address: address.trim(),
        note: note.trim() || undefined,
      });
      reset();
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "승하차지 추가에 실패했습니다");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  if (confirming) {
    return (
      <Dialog
        title="강제 승하차지 추가를 확정합니다"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
              다시 확인
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "처리 중..." : "확정하고 추가"}
            </Button>
          </>
        }
      >
        <StyledConfirmBody>
          <p>이 작업은 되돌릴 수 없습니다. 확정하면 다음 확정 배치 때 명단에 반영됩니다.</p>
          <p>
            대상: {mode === "existing" ? `학생 ID ${studentIdInput}` : `신규 학생 · ${newStudentName}`}
          </p>
          <p>승하차지: {address}</p>
        </StyledConfirmBody>
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </Dialog>
    );
  }

  return (
    <Dialog
      title="강제 승하차지 추가"
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            취소
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={() => setConfirming(true)}>
            다음
          </Button>
        </>
      }
    >
      <StyledDialogForm>
        <SegmentedControl
          options={[
            { value: "existing", label: "기존 학생" },
            { value: "new", label: "신규 학생" },
          ]}
          value={mode}
          onChange={(value) => setMode(value as Mode)}
        />
        {mode === "existing" ? (
          <Input
            label="학생 ID"
            required
            value={studentIdInput}
            onChange={(event) => setStudentIdInput(event.target.value)}
          />
        ) : (
          <Input
            label="학생 이름"
            required
            value={newStudentName}
            onChange={(event) => setNewStudentName(event.target.value)}
          />
        )}
        <Input
          label="승하차 주소"
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
        <Input label="메모" value={note} onChange={(event) => setNote(event.target.value)} />
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledDialogForm>
    </Dialog>
  );
};
