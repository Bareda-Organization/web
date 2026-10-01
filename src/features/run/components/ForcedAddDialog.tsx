"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, SegmentedControl } from "@/shared/ui";
import { StopAddressSearch } from "@/features/route";
import { FREE_TEXT_PRIVACY_NOTICE } from "@/shared/lib/freeTextNotice";
import { postForcedAdd, searchStudents } from "../api";
import type { StudentSearchItemTypes } from "../types";
import { StyledAddressHint, StyledAddressPicker, StyledDialogForm, StyledConfirmBody } from "./ForcedAddDialog.styled";

type Mode = "existing" | "new";

// §5.7 메모는 200자까지 — 넘으면 서버가 422 로 거부한다.
const NOTE_MAX_LENGTH = 200;

// §5.7 에러 코드별 문구 — 영문 코드·서버 원문은 화면에 내지 않는다(StudentTransferDialog 와 같은 방침).
const forcedAddErrorMessage = (cause: unknown): string => {
  if (!(cause instanceof ApiError)) return "승하차지 추가에 실패했습니다. 잠시 뒤 다시 시도해 주세요";
  switch (cause.code) {
    case "CHANGE_WINDOW_CLOSED":
      return "출발 30분 전이 지나 추가할 수 없습니다";
    case "CAPACITY_EXCEEDED":
      return "버스 정원이 가득 차 추가할 수 없습니다";
    case "ADDRESS_VERIFICATION_FAILED":
      return "주소를 확인하지 못했습니다. 주소를 다시 확인해 주세요";
    case "RUN_CANCELED":
      return "취소된 회차라 추가할 수 없습니다";
    case "FORCED_ADDITION_ALREADY_STAGED":
      return "이 학생은 이 회차에 이미 강제 추가 대기 중입니다";
    default:
      return cause.message;
  }
};

type ForcedAddDialogProps = {
  runId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

// §5.7 POST /staff/runs/{runId}/forced-add(A-07) — 되돌릴 수 없는 조작이라(BRIEF §3-3)
// 입력 단계와 별개로 확정 단계를 하나 더 둔다. student_id·new_student.name 은
// 배타적이라(§5.7) 라디오로 갈라 한쪽만 서버에 보낸다.
export const ForcedAddDialog = ({ runId, open, onClose, onDone }: ForcedAddDialogProps) => {
  const [mode, setMode] = useState<Mode>("existing");
  // F01-07 — 기존 학생은 내부 ID 를 입력받지 않고 이름으로 찾아 고른다.
  const [studentQuery, setStudentQuery] = useState("");
  const [candidates, setCandidates] = useState<StudentSearchItemTypes[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchItemTypes | null>(null);
  const [newStudentName, setNewStudentName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMode("existing");
    setStudentQuery("");
    setCandidates(null);
    setSelectedStudent(null);
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
    (mode === "existing" ? selectedStudent != null : newStudentName.trim().length > 0);

  const handleSearch = async () => {
    setSearching(true);
    setError(null);
    try {
      setCandidates(await searchStudents(studentQuery.trim()));
    } catch (cause) {
      setCandidates(null);
      setError(cause instanceof ApiError ? cause.message : "학생을 검색하지 못했습니다");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await postForcedAdd(runId, {
        studentId: mode === "existing" ? selectedStudent?.studentId : undefined,
        newStudentName: mode === "new" ? newStudentName.trim() : undefined,
        address: address.trim(),
        note: note.trim() || undefined,
      });
      reset();
      onDone();
    } catch (cause) {
      setError(forcedAddErrorMessage(cause));
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
            대상: {mode === "existing" ? `${selectedStudent?.name} 학생` : `신규 학생 · ${newStudentName}`}
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
          <>
            <Input
              label="학생 이름 검색"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSearch}
              disabled={searching || studentQuery.trim().length === 0}
            >
              검색
            </Button>
            {candidates?.length === 0 ? <p>검색 결과가 없습니다</p> : null}
            {candidates?.map((student) => (
              <Button
                key={student.studentId}
                variant={selectedStudent?.studentId === student.studentId ? "primary" : "ghost"}
                size="sm"
                aria-pressed={selectedStudent?.studentId === student.studentId}
                onClick={() => setSelectedStudent(student)}
              >
                {`${student.name} · ${student.className ?? "-"}`}
              </Button>
            ))}
          </>
        ) : (
          <Input
            label="학생 이름"
            required
            value={newStudentName}
            onChange={(event) => setNewStudentName(event.target.value)}
          />
        )}
        {/* 주소는 노선 편성과 같은 검색에서 후보를 골라 정한다 — 직접 쳐서 확정 단계에서 틀렸다고 알게 되지 않게 한다. */}
        <StyledAddressPicker>
          <span>승하차 주소 검색</span>
          <StopAddressSearch onPick={(suggestion) => setAddress(suggestion.displayName)} />
          <StyledAddressHint>
            {address ? `선택한 주소: ${address}` : "검색한 뒤 후보에서 주소를 골라 주세요"}
          </StyledAddressHint>
        </StyledAddressPicker>
        <Input
          label="메모"
          hint={FREE_TEXT_PRIVACY_NOTICE}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={NOTE_MAX_LENGTH}
        />
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledDialogForm>
    </Dialog>
  );
};
