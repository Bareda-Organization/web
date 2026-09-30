"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Select } from "@/shared/ui";
import { getManagers, patchRunAssignment } from "../api";
import type { ManagerSummaryResponseTypes } from "../types";
import { StyledDialogForm, StyledWarningList } from "./ManagerAssignmentDialog.styled";

type ManagerAssignmentDialogProps = {
  runId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

// §5.14 PATCH /staff/runs/{runId}/assignment(A-06). 후보 목록은 §5.13 GET /staff/managers
// 에서 부수 조회한다(run/api/managers.ts 주석 참고). 경고 3종(WORK_HOURS_MISMATCH ·
// MANAGER_DOUBLE_BOOKED · WORK_HOURS_NOT_SET)은 비차단이라 배치 자체는 성공시키고
// warnings[] 를 그대로 보여준다 — 막는 것은 409 DUPLICATE_ASSIGNMENT 뿐이다.
export const ManagerAssignmentDialog = ({ runId, open, onClose, onDone }: ManagerAssignmentDialogProps) => {
  const [drivers, setDrivers] = useState<ManagerSummaryResponseTypes[]>([]);
  const [escorts, setEscorts] = useState<ManagerSummaryResponseTypes[]>([]);
  const [driverManagerId, setDriverManagerId] = useState("");
  const [escortManagerId, setEscortManagerId] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCandidates = useCallback(async () => {
    try {
      const managers = await getManagers();
      setDrivers(managers.filter((m) => m.role === "driver"));
      setEscorts(managers.filter((m) => m.role === "escort"));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "후보 목록을 불러오지 못했습니다");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      await loadCandidates();
    })();
  }, [open, loadCandidates]);

  if (!open) return null;

  // F01-06 — 부모가 이 대화상자를 항상 마운트해 두므로 어떤 경로로 닫혀도(취소·경고 확인·저장 성공)
  // 상태를 비워야 다시 열 때 이전 경고 화면·선택값이 남지 않는다.
  const resetState = () => {
    setDriverManagerId("");
    setEscortManagerId("");
    setWarnings([]);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDone = () => {
    resetState();
    onDone();
  };

  // ⚠ warnings[] 가 와도 요청 자체는 이미 200 으로 성공해 배치가 반영된 뒤다
  // (run/api/assignment.ts 주석) — 그래서 재제출 버튼을 두지 않고, 경고는 "이미
  // 적용됐다"는 사실과 함께 확인만 받고 닫는다.
  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await patchRunAssignment(runId, {
        driverManagerId: driverManagerId || undefined,
        escortManagerId: escortManagerId || undefined,
      });
      if (result.warnings.length > 0) {
        setWarnings(result.warnings.map((w) => w.message));
      } else {
        handleDone();
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "배치 변경에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title="매니저 배치 변경"
      onClose={handleClose}
      footer={
        warnings.length > 0 ? (
          <Button variant="primary" onClick={handleDone}>
            확인
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </>
        )
      }
    >
      <StyledDialogForm>
        <Select
          label="기사"
          value={driverManagerId}
          onChange={(event) => setDriverManagerId(event.target.value)}
          options={[{ value: "", label: "변경 안 함" }, ...drivers.map((d) => ({ value: String(d.id), label: d.name }))]}
        />
        <Select
          label="동승 매니저"
          value={escortManagerId}
          onChange={(event) => setEscortManagerId(event.target.value)}
          options={[{ value: "", label: "변경 안 함" }, ...escorts.map((e) => ({ value: String(e.id), label: e.name }))]}
        />
        {warnings.length > 0 ? (
          <StyledWarningList>
            <AlertBanner tone="moving" title="배치는 반영됐지만 확인할 경고가 있습니다" />
            {warnings.map((message, index) => (
              <AlertBanner key={index} tone="moving" title={message} />
            ))}
          </StyledWarningList>
        ) : null}
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledDialogForm>
    </Dialog>
  );
};
