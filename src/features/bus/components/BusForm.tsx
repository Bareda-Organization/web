"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, Switch } from "@/shared/ui";
import { createBus, updateBus } from "../api";
import type { BusItemResponseTypes } from "../types";

type BusFormProps = {
  /** 있으면 수정, 없으면 등록. §5.12 에는 상세 GET 이 없어 목록 행 데이터를 그대로 받는다. */
  bus?: BusItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

// §5.12 POST·PATCH /staff/buses(BUS-02·03) — 차량 등록·수정 폼.
// student_capacity 는 응답 전용(배차 시 자동 계산)이라 폼에 필드를 두지 않는다.
export const BusForm = ({ bus, onClose, onDone }: BusFormProps) => {
  const [busNo, setBusNo] = useState(bus?.busNo ?? "");
  const [plateNo, setPlateNo] = useState(bus?.plateNo ?? "");
  const [capacity, setCapacity] = useState(bus ? String(bus.capacity) : "");
  const [operable, setOperable] = useState(bus?.operable ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = busNo.trim().length > 0 && plateNo.trim().length > 0 && Number(capacity) > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const request = { busNo: busNo.trim(), plateNo: plateNo.trim(), capacity: Number(capacity), operable };
      if (bus) {
        await updateBus(bus.id, request);
      } else {
        await createBus(request);
      }
      onDone();
    } catch (cause) {
      // 409 DUPLICATE_BUS_NO · 409 CAPACITY_EXCEEDED 는 화면이 그 경계를 그대로 말한다 —
      // "정원 초과" 를 "등록 실패" 로 뭉뚱그리면 다음 행동(정원을 늘릴지 배정을 줄일지)을 알 수 없다.
      setError(cause instanceof ApiError ? cause.message : "차량 저장에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={bus ? "차량 정보 수정" : "차량 등록"}
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
      <Input label="호차" required value={busNo} onChange={(event) => setBusNo(event.target.value)} />
      <Input label="차량번호" required value={plateNo} onChange={(event) => setPlateNo(event.target.value)} />
      <Input
        label="승차 정원"
        required
        type="number"
        min={1}
        value={capacity}
        onChange={(event) => setCapacity(event.target.value)}
      />
      <Switch
        label="운행 가능"
        checked={operable}
        onChange={(event) => setOperable(event.target.checked)}
      />
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
