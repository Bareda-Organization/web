"use client";

import { useState } from "react";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Badge, Button, Dialog, Textarea } from "@/shared/ui";
import { DefinitionList } from "@/shared/ui/display";
import { forceConfirmRun } from "../api";
import { untilText } from "../lib/relativeTime";
import type { ForceConfirmResponseTypes, RunLiveItemResponseTypes } from "../types";
import { StyledResultList } from "./ForceConfirmPage.styled";

type ForceConfirmDialogProps = {
  run: RunLiveItemResponseTypes;
  /** 회차가 속한 학원 이름 — 목록 응답(§6.8)에는 학원 이름이 없어 화면이 넘긴다 */
  academyName?: string;
  onClose: () => void;
  onDone: () => void;
};

// §6.14 강제 확정 사유는 최대 200자(Ruling 790). 서버도 같은 길이로 422 를 낸다.
const REASON_MAX_LENGTH = 200;

// §6.14, BRIEF-a1.md §4.1 — "확인 단계와 그 결과 표시가 이 화면의 본체". 되돌릴 수 없는
// 동작이라 (1) 사유 입력 없이는 실행 단추를 켜지 않고(꺼진 단추 아래에 켜지는 조건을 적는다 — U-05) (2) 성공한 뒤에는 폼으로
// 되돌아가지 못하게 결과 화면으로 고정한다 — 실수로 두 번 누르는 경로 자체를 없앤다.
export const ForceConfirmDialog = ({ run, academyName, onClose, onDone }: ForceConfirmDialogProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForceConfirmResponseTypes | null>(null);

  const reasonIsBlank = reason.trim().length === 0;
  const direction = run.direction === "to_academy" ? "등원" : "하원";

  const handleConfirm = async () => {
    if (reasonIsBlank) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await forceConfirmRun(run.runId, reason.trim());
      setResult(data);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "RUN_NOT_IDLE") {
        setError("이미 확정되었거나 대기 상태가 아닌 회차입니다 — 새로고침 후 다시 확인하세요.");
      } else if (cause instanceof ApiError && cause.code === "RUN_NOT_DUE") {
        setError("아직 확정 예정 시각 전이라 강제 확정할 수 없습니다.");
      } else if (cause instanceof ApiError && cause.code === "RUN_CANCELED") {
        setError("임시 취소된 회차라 강제 확정할 수 없습니다.");
      } else {
        setError(cause instanceof ApiError ? cause.message : "강제 확정에 실패했습니다");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Dialog title="강제 확정 완료" onClose={onDone} footer={<Button onClick={onDone}>닫기</Button>}>
        <AlertBanner tone="boarded" title="폴백 경로로 확정되었습니다">
          이 결과는 되돌릴 수 없습니다. 관계자에게 통지가 이미 발송되었습니다.
        </AlertBanner>
        <StyledResultList>
          <p>회차 ID: {result.runId}</p>
          <p>새 노선 버전 ID: {result.routeVersionId}</p>
          <p>확정 시각: {formatDateTime(result.confirmedAt)}</p>
          <p>
            <Badge tone="amber">폴백 계산 사용</Badge>
          </p>
        </StyledResultList>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={`${run.busNo} 강제 확정`}
      showClose
      onClose={onClose}
      actionHint={reasonIsBlank ? "사유를 입력하면 [강제 확정] 버튼이 켜집니다" : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={submitting || reasonIsBlank}>
            {submitting ? "실행 중..." : "강제 확정"}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 16 }}>
        <AlertBanner tone="missed" title="되돌릴 수 없는 동작입니다">
          직선거리 폴백 계산으로 바로 확정되고, 관계자 · 기사 · 동승자 통지가 곧바로 나갑니다.
        </AlertBanner>
        <DefinitionList
          items={[
            { term: "회차", value: `${academyName ? `${academyName} ` : ""}${run.busNo} · ${direction} 출발 ${formatClockTime(run.departTime)}` },
            {
              term: "확정 예정",
              value: `${formatClockTime(run.confirmAt)} ${untilText(run.confirmAt)}${run.consecutiveFailures > 0 ? ` · ${run.consecutiveFailures}회 연속 실패` : ""}`,
            },
          ]}
        />
        <Textarea
          label="강제 확정 사유"
          required
          maxLength={REASON_MAX_LENGTH}
          placeholder="예: 노선 계산이 3회 연속 실패하여 폴백으로 개입"
          hint="감사 이력에 남습니다 · 학생 이름·연락처는 적지 마세요"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </div>
    </Dialog>
  );
};
