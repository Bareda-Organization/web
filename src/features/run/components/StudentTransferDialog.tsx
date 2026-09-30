"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, SegmentedControl, Select } from "@/shared/ui";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { getRunRoute } from "@/features/route";
import { postTransfer } from "../api";
import type { DashboardRunResponseTypes, RosterItemResponseTypes, TransferResponseTypes } from "../types";
import { StyledDialogForm, StyledConfirmBody } from "./ForcedAddDialog.styled";

type Mode = "stop" | "address";
type StopOption = { stopId: string; name: string };

export type StudentTransferDialogProps = {
  student: RosterItemResponseTypes;
  fromRun: DashboardRunResponseTypes;
  /** 옮겨 갈 수 있는 회차 — 같은 날짜·같은 방향·확정 전인 다른 버스(호출부가 걸러서 준다) */
  candidateRuns: DashboardRunResponseTypes[];
  onClose: () => void;
  onDone: () => void;
};

// §5.8 에러 코드별 문구 — 영문 코드·서버 원문은 화면에 내지 않는다. 정원 초과는 현재 인원·정원을 병기한다.
const transferErrorMessage = (cause: unknown): string => {
  if (!(cause instanceof ApiError)) return "이동을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요";
  switch (cause.code) {
    case "CHANGE_WINDOW_CLOSED":
      return "출발 30분 전이 지나 이미 확정된 회차가 있어 옮길 수 없습니다";
    case "RUN_CANCELED":
      return "취소된 회차가 있어 옮길 수 없습니다";
    case "CAPACITY_EXCEEDED": {
      const { current, capacity } = cause.details ?? {};
      return typeof current === "number" && typeof capacity === "number"
        ? `도착 버스가 가득 차 옮길 수 없습니다 (현재 ${current}명 / 정원 ${capacity}명)`
        : "도착 버스가 가득 차 옮길 수 없습니다";
    }
    case "STUDENT_NOT_IN_RUN":
      return "이 학생이 출발 버스 명단에 없습니다";
    case "TRANSFER_ALREADY_STAGED":
      return "이 학생은 이미 옮기기로 저장된 건이 있습니다";
    case "STUDENT_ALREADY_IN_RUN":
      return "이 학생은 이미 도착 회차 명단에 있어 옮길 수 없습니다";
    default:
      return cause.message;
  }
};

// §5.8 POST /staff/students/{id}/transfer(A-07, UF-M-04) — 확정 전(①구간) 회차의 학생 1명을 같은 날짜·
// 같은 방향의 다른 버스로 옮긴다. 저장은 대기 저장이라 그날 명단에는 출발 30분 전 확정 때 반영된다.
// stop_id·address 는 배타적이라 갈래를 탭으로 갈라 한쪽만 보낸다.
export const StudentTransferDialog = ({ student, fromRun, candidateRuns, onClose, onDone }: StudentTransferDialogProps) => {
  const [toRunId, setToRunId] = useState("");
  const [stops, setStops] = useState<StopOption[]>([]);
  const [mode, setMode] = useState<Mode>("stop");
  const [stopId, setStopId] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // C00-02 — 도착 회차의 승하차지 목록이 비는 이유(고정 노선 없음 · 조회 실패). 말없이 비면 고장으로 읽힌다.
  const [stopsNotice, setStopsNotice] = useState<string | null>(null);
  const [result, setResult] = useState<TransferResponseTypes | null>(null);

  // 도착 회차를 고르면 그 노선의 기존 승하차지를 불러온다(도착지=학원은 승하차지가 아니라 뺀다).
  useEffect(() => {
    if (!toRunId) return;
    let stale = false;
    (async () => {
      try {
        const route = await getRunRoute(toRunId);
        if (stale) return;
        setStops(route.stops.filter((stop) => !stop.isDestination).map((stop) => ({ stopId: stop.stopId, name: stop.name })));
      } catch (cause) {
        if (stale) return;
        setStops([]);
        // §5.19 — 확정 전 회차는 고정 노선이 있으면 예정 경로로 200, 없을 때만 409 RUN_NOT_CONFIRMED.
        if (cause instanceof ApiError && cause.code === "RUN_NOT_CONFIRMED") {
          setStopsNotice("이 회차는 고정 노선이 없어 주소로만 지정할 수 있습니다");
          setMode("address");
        } else {
          setStopsNotice("승하차지 목록을 불러오지 못했습니다. 주소로 지정하거나 다시 골라 주세요");
        }
      }
    })();
    return () => {
      stale = true;
    };
  }, [toRunId]);

  const handleToRunChange = (value: string) => {
    setToRunId(value);
    setStops([]);
    setStopId("");
    setStopsNotice(null);
  };

  const canSubmit = toRunId !== "" && (mode === "stop" ? stopId !== "" : address.trim().length > 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      setResult(
        await postTransfer(student.studentId, {
          fromRunId: fromRun.runId,
          toRunId,
          stopId: mode === "stop" ? stopId : undefined,
          address: mode === "address" ? address.trim() : undefined,
          note: note.trim() || undefined,
        }),
      );
    } catch (cause) {
      setError(transferErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Dialog title="다른 버스로 이동 저장" onClose={onDone} footer={<Button onClick={onDone}>확인</Button>}>
        <StyledConfirmBody>
          <p>{student.name} 학생의 이동을 저장했습니다. 명단에는 출발 30분 전 확정 때 반영됩니다.</p>
          <p>{fromRun.busNo} 탑승 인원</p>
          <p>{`${result.impact.from.riderCountBefore}명 → ${result.impact.from.riderCountAfter}명`}</p>
          <p>도착 버스 탑승 인원</p>
          <p>{`${result.impact.to.riderCountBefore}명 → ${result.impact.to.riderCountAfter}명 (정원 ${result.impact.to.capacity}명)`}</p>
        </StyledConfirmBody>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={`${student.name} 학생 — 다른 버스로`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </>
      }
    >
      <StyledDialogForm>
        <p>
          지금 {fromRun.busNo}에서 빠지고 아래 버스에 추가됩니다. 저장하면 바로 옮겨지는 것이 아니라 출발 30분 전 확정 때 반영됩니다.
        </p>
        {candidateRuns.length === 0 ? (
          <AlertBanner tone="info" title="같은 방향으로 옮길 수 있는 다른 버스 회차가 없습니다" />
        ) : null}
        <Select
          label="도착 회차"
          value={toRunId}
          onChange={(event) => handleToRunChange(event.target.value)}
          options={[
            { value: "", label: "선택해 주세요" },
            ...candidateRuns.map((run) => ({ value: run.runId, label: `${run.busNo} · ${formatClockTime(run.departTime)} 출발` })),
          ]}
        />
        <SegmentedControl
          options={[
            { value: "stop", label: "기존 승하차지" },
            { value: "address", label: "주소 입력" },
          ]}
          value={mode}
          onChange={(value) => setMode(value as Mode)}
        />
        {stopsNotice ? <AlertBanner tone="info" title={stopsNotice} /> : null}
        {mode === "stop" ? (
          <Select
            label="승하차지"
            value={stopId}
            onChange={(event) => setStopId(event.target.value)}
            disabled={toRunId === ""}
            options={[
              { value: "", label: toRunId === "" ? "도착 회차를 먼저 골라 주세요" : "선택해 주세요" },
              ...stops.map((stop) => ({ value: stop.stopId, label: stop.name })),
            ]}
          />
        ) : (
          <Input label="승하차 주소" value={address} onChange={(event) => setAddress(event.target.value)} />
        )}
        <Input label="비고" value={note} onChange={(event) => setNote(event.target.value)} />
        {error ? <AlertBanner tone="missed" title={error} /> : null}
      </StyledDialogForm>
    </Dialog>
  );
};
