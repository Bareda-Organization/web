"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, StatusChip } from "@/shared/ui";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { deleteStudent, getWithdrawalPreview } from "../api";
import type { StudentListItemResponseTypes, WithdrawalPreviewResponseTypes, WithdrawalPreviewRunTypes } from "../types";
import { StyledPreviewList } from "./StudentList.styled";

type StudentWithdrawDialogProps = {
  student: StudentListItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;

const runLabel = (run: WithdrawalPreviewRunTypes) => `${run.busNo} ${DIRECTION_LABEL[run.direction]} ${formatClockTime(run.departTime)}`;

// §5.11 DELETE /staff/students/{id}(STU-04) — 퇴원 처리. soft delete 라 오늘 명단은 유지되고 내일부터 제외되므로,
// "삭제" 가 아니라 "퇴원" 이라는 실제 의미로 확인을 받는다. 확인 창은 퇴원이 오늘 · 내일 운행에 미치는 영향을 먼저 보인다
// (GET …/withdrawal-preview, Ruling 815) — 되돌릴 수 없어 영향 판단 근거가 필요하다.
export const StudentWithdrawDialog = ({ student, onClose, onDone }: StudentWithdrawDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 미리보기는 보조 정보라 못 받아도 퇴원 확인은 그대로 된다(옛 서버 · 일시 오류) — 그때는 고정 문구만 보인다.
  const [preview, setPreview] = useState<WithdrawalPreviewResponseTypes | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWithdrawalPreview(student.studentId)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [student.studentId]);

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

  const tomorrowStops = preview ? [...new Set(preview.tomorrowRuns.map((run) => run.stopName).filter(Boolean))] : [];

  return (
    <Dialog
      title="학생 퇴원 처리"
      showClose
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
      <p>
        <b>{student.name}</b> 학생을 퇴원 처리할까요?
        {preview ? null : " 오늘 명단은 유지되고 내일 운행부터 제외됩니다."}
      </p>
      {preview ? (
        <StyledPreviewList aria-label="퇴원 영향">
          <div>
            <dt>오늘</dt>
            <dd>
              <StatusChip tone="ok" marker={false}>명단 유지</StatusChip>{" "}
              {preview.todayRuns.length > 0
                ? `남은 운행 ${preview.todayRuns.length}회(${runLabel(preview.todayRuns[0])})에 계속 표시`
                : "오늘 남은 운행이 없습니다"}
            </dd>
          </div>
          <div>
            <dt>내일부터</dt>
            <dd>
              <StatusChip tone="bad" marker={false}>명단 제외</StatusChip>{" "}
              {preview.tomorrowRuns.length > 0
                ? `${[...new Set(preview.tomorrowRuns.map((run) => DIRECTION_LABEL[run.direction]))].join(" · ")} 모두. ${tomorrowStops.length > 0 ? `${preview.tomorrowRuns[0].busNo} “${tomorrowStops[0]}” 인원 −1명` : "탑승 명단에서 빠집니다"}`
                : "내일 운행 명단에는 들어 있지 않습니다"}
            </dd>
          </div>
          <div>
            <dt>지난 기록</dt>
            <dd>탑승 · 알림 기록은 그대로 보존</dd>
          </div>
        </StyledPreviewList>
      ) : null}
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
