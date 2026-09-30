"use client";

import { useState } from "react";
import { BusOptionsNotice, useBusOptions } from "@/features/bus";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, Select } from "@/shared/ui";
import { createRun } from "../api";
import type { ScheduleDirection } from "../types";

type RunAddFormProps = {
  serviceDate: string;
  onClose: () => void;
  onDone: () => void;
};

const DIRECTION_OPTIONS: { value: ScheduleDirection; label: string }[] = [
  { value: "to_academy", label: "등원" },
  { value: "from_academy", label: "하원" },
];

// §5.10 POST /staff/runs(SCH-03) — 특정일 회차 임시 추가. 정규 스케줄과 무관한
// 1회성 운행이라 만들어진 회차는 schedule_id 가 비어 있다(실측 확인, api/index.ts 주석).
export const RunAddForm = ({ serviceDate, onClose, onDone }: RunAddFormProps) => {
  const [selectedBusId, setBusId] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<ScheduleDirection>("to_academy");
  const [departTime, setDepartTime] = useState("");
  const [originName, setOriginName] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [estDurationMin, setEstDurationMin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busOptions = useBusOptions();
  // 목록의 첫 차량이 기본 선택이다.
  const busId = selectedBusId ?? busOptions.buses[0]?.id;

  const canSubmit =
    busId !== undefined &&
    departTime.trim().length > 0 &&
    originName.trim().length > 0 &&
    destinationName.trim().length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (busId === undefined) return;
    setSubmitting(true);
    setError(null);
    try {
      await createRun({
        busId,
        serviceDate,
        direction,
        departTime,
        originName: originName.trim(),
        destinationName: destinationName.trim(),
        estDurationMin: estDurationMin === "" ? undefined : Number(estDurationMin),
      });
      onDone();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "DUPLICATE_RUN") {
        setError("같은 차량·날짜·방향·출발 시각의 회차가 이미 있습니다.");
      } else {
        setError(cause instanceof ApiError ? cause.message : "임시 회차 추가에 실패했습니다");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={`${serviceDate} 임시 회차 추가`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? "추가 중..." : "추가"}
          </Button>
        </>
      }
    >
      <Select
        label="차량"
        options={busOptions.options}
        value={busId ?? ""}
        onChange={(event) => setBusId(event.target.value)}
      />
      <BusOptionsNotice error={busOptions.error} hasMore={busOptions.hasMore} onRetry={busOptions.reload} />
      <Select
        label="방향"
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={(event) => setDirection(event.target.value as ScheduleDirection)}
      />
      <Input
        label="출발 시각"
        required
        type="time"
        value={departTime}
        onChange={(event) => setDepartTime(event.target.value)}
      />
      <Input label="출발지" required value={originName} onChange={(event) => setOriginName(event.target.value)} />
      <Input
        label="도착지"
        required
        value={destinationName}
        onChange={(event) => setDestinationName(event.target.value)}
      />
      <Input
        label="예상 소요시간"
        type="number"
        min={0}
        suffix="분"
        value={estDurationMin}
        onChange={(event) => setEstDurationMin(event.target.value)}
      />
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
