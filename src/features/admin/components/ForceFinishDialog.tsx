"use client";

import { useState } from "react";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Textarea } from "@/shared/ui";
import { DefinitionList } from "@/shared/ui/display";
import { forceFinishRun } from "../api";
import { serviceDateLabel } from "../lib/staleRuns";
import type { ForceFinishResponseTypes, StaleMovingRunItemResponseTypes } from "../types";

type ForceFinishDialogProps = {
  run: StaleMovingRunItemResponseTypes;
  onClose: () => void;
  onDone: (result: ForceFinishResponseTypes) => void;
};

// §6.17 강제 종료 사유는 최대 200자(Ruling 790).
const REASON_MAX_LENGTH = 200;

// §6.17 — 되돌릴 수 없는 동작이라 사유 입력 없이는 실행 단추를 켜지 않는다(꺼진 단추 아래에 켜지는 조건을 적는다 — U-05). 남은 탑승자 수를 경고 문구에 그대로
// 보여 준다 — 이 동작은 그 인원을 하차 처리하지 않고 회차만 닫는다. 성공하면 바로 onDone 으로 넘겨 목록이 그 행을 지우고
// 저장 알림을 띄우게 한다(결과 화면을 따로 두지 않는다 — 폼으로 돌아갈 길이 없어 두 번 누를 수 없다).
export const ForceFinishDialog = ({ run, onClose, onDone }: ForceFinishDialogProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonIsBlank = reason.trim().length === 0;
  const direction = run.direction === "to_academy" ? "등원" : "하원";

  const handleConfirm = async () => {
    if (reasonIsBlank) return;
    setSubmitting(true);
    setError(null);
    try {
      onDone(await forceFinishRun(run.runId, reason.trim()));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "RUN_NOT_MOVING") {
        setError("이미 끝났거나 이동 중이 아닌 회차입니다 — 닫고 목록을 다시 확인하세요.");
      } else if (cause instanceof ApiError && cause.code === "RUN_NOT_STALE") {
        setError("운행일이 오늘 또는 어제인 회차는 동승자의 하차 처리로만 끝납니다.");
      } else if (cause instanceof ApiError && cause.code === "RUN_CANCELED") {
        setError("임시 취소된 회차라 강제 종료할 수 없습니다.");
      } else {
        setError(cause instanceof ApiError ? cause.message : "강제 종료에 실패했습니다");
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={`${run.academyName} ${run.busNo} 강제 종료`}
      showClose
      onClose={onClose}
      actionHint={reasonIsBlank ? "사유를 입력하면 [강제 종료] 버튼이 켜집니다" : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting || reasonIsBlank}>
            {submitting ? "실행 중..." : "강제 종료"}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 16 }}>
        <AlertBanner tone="missed" title="되돌릴 수 없는 동작입니다">
          {run.boardedCount > 0
            ? `아직 탑승 중인 ${run.boardedCount}명은 하차 처리 없이 그대로 남고 회차만 종료됩니다. `
            : "남은 탑승자는 없습니다. "}
          학부모·관계자 알림은 나가지 않습니다. 해당 학원에 먼저 확인한 뒤 실행하세요.
        </AlertBanner>
        <DefinitionList
          items={[
            {
              term: "회차",
              value: `${run.academyName} ${run.busNo} · ${direction} ${serviceDateLabel(run.serviceDate).date}${run.startedAt ? ` · 운행 시작 ${formatClockTime(run.startedAt)}` : ""}`,
            },
            { term: "학원 연락처", value: run.academyContact ?? "등록된 연락처 없음" },
          ]}
        />
        <Textarea
          label="강제 종료 사유"
          required
          maxLength={REASON_MAX_LENGTH}
          placeholder="예: 기사 단말 종료로 운행이 끝나지 않은 채 남음 — 학원 확인 완료"
          hint="감사 이력에 남습니다 · 학생 이름·연락처는 적지 마세요"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </div>
    </Dialog>
  );
};
