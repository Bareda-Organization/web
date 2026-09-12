"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog } from "@/shared/ui";
import { deleteStudent } from "../api";
import type { StudentListItemResponseTypes } from "../types";

type StudentWithdrawDialogProps = {
  student: StudentListItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// §5.11 DELETE /staff/students/{id}(STU-04) — 퇴원 처리. soft delete 라 오늘 명단은
// 유지되고 내일부터 제외되므로, "삭제" 가 아니라 "퇴원" 이라는 실제 의미로 확인을 받는다.
export const StudentWithdrawDialog = ({ student, onClose, onDone }: StudentWithdrawDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteStudent(student.studentId);
      onDone();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "퇴원 처리에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title="학생 퇴원 처리"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "처리 중..." : "퇴원 처리"}
          </Button>
        </>
      }
    >
      <p>{student.name} 학생을 퇴원 처리할까요? 오늘 명단은 유지되고 내일 운행부터 제외됩니다.</p>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
