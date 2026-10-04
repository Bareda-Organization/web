"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { AlertBanner, Button, Dialog, StatusChip } from "@/shared/ui";
import { cancelRun } from "../api";
import type { RunItemResponseTypes } from "../types";
import { formatDateWithWeekday } from "../lib/scheduleBoard";
import { StyledCancelKv } from "./ScheduleList.styled";

type RunCancelDialogProps = {
  runId: string;
  /** 취소할 회차 — 있으면 제목과 영향 표에 그 회차를 말한다 */
  run?: RunItemResponseTypes;
  onCancel: () => void;
  onCanceled: () => void;
};

const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;
const ROLE_LABEL = { driver: "기사", escort: "동승" } as const;

// §5.10 DELETE /staff/runs/{id}(SCH-03) — "행을 지우지 않고 canceled_at 을 채운다"
// (실측 확인, api/index.ts 주석). 404 RUN_NOT_FOUND 는 존재 비노출(Ruling 163,
// emergency·route 와 같은 전례) — ApiError.message 그대로 보여준다.
// 확인 대화상자(S-09) — 취소하면 무엇이 바뀌고 무엇이 그대로인지를 실행 전에 보인다.
export const RunCancelDialog = ({ runId, run, onCancel, onCanceled }: RunCancelDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await cancelRun(runId);
      onCanceled();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "회차 취소에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const label = run ? `${formatClockTime(run.departTime)} · ${run.busNo} ${DIRECTION_LABEL[run.direction]}` : undefined;

  return (
    <Dialog
      title={label ? `${label} 회차 취소` : "회차 취소"}
      showClose
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            돌아가기
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "취소 중..." : "회차 취소"}
          </Button>
        </>
      }
    >
      <p>
        {label ? <b>{label}</b> : "이"} 회차를 취소할까요? 오늘 하루만 빠지는 임시 취소입니다.
      </p>
      <StyledCancelKv aria-label="회차 취소 영향">
        {run ? (
          <div>
            <dt>회차</dt>
            <dd>
              {formatDateWithWeekday(run.serviceDate)} {formatClockTime(run.departTime)} · {run.busNo} {DIRECTION_LABEL[run.direction]} · {run.scheduleId === null ? "임시" : "정규"}
              {run.assignments.length > 0 ? ` · ${run.assignments.map((assignment) => `${ROLE_LABEL[assignment.role]} ${assignment.name}`).join(" · ")}` : ""}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>바뀌는 것</dt>
          <dd>
            <StatusChip tone="bad" marker={false}>
              목록에서 제외
            </StatusChip>{" "}
            매니저 앱 목록 · 관제 · 대시보드 집계에서 빠지고, 시작 · 이동 · 배치 변경은 거절됩니다
          </dd>
        </div>
        <div>
          <dt>그대로인 것</dt>
          <dd>정규 스케줄 · 다른 날의 같은 회차 (행은 지워지지 않고 취소 표시만 남아 기록이 유지됩니다)</dd>
        </div>
      </StyledCancelKv>
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
