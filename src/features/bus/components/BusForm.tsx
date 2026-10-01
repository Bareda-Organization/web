"use client";

import { useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, Switch } from "@/shared/ui";
import { formatDateTime } from "@/shared/lib/format/dateTime";
import { createBus, updateBus } from "../api";
import type { BusItemResponseTypes } from "../types";

const DIRECTION_LABEL = { to_academy: "등원", from_academy: "하원" } as const;

type BusFormProps = {
  /** 있으면 수정, 없으면 등록. §5.12 에는 상세 GET 이 없어 목록 행 데이터를 그대로 받는다. */
  bus?: BusItemResponseTypes;
  onClose: () => void;
  /** 저장한 차량의 id — 목록이 그 행을 잠깐 강조한다 */
  onDone: (savedBusId?: string) => void;
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
  const [warnings, setWarnings] = useState<string[]>([]);

  const canSubmit = busNo.trim().length > 0 && plateNo.trim().length > 0 && Number(capacity) > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const request = { busNo: busNo.trim(), plateNo: plateNo.trim(), capacity: Number(capacity), operable };
      if (bus) {
        // W5 — 정원 축소로 기배정 인원이 넘치는 회차가 있으면 저장은 이미 됐고
        // warnings[] 만 실려 온다(§5.12 BR-116). ManagerAssignmentDialog.tsx 와
        // 같은 판단 — 되돌릴 수 없는 저장 뒤라 재제출 없이 확인만 받는다.
        const result = await updateBus(bus.id, request);
        if (result.warnings.length > 0) {
          setWarnings(
            result.warnings.map(
              (w) =>
                `정원 ${w.studentCapacity}명을 넘는 회차가 있습니다 — 배정 인원 ${w.assignedCount}명 (${formatDateTime(w.departTime)} ${DIRECTION_LABEL[w.direction]} 회차, 회차 번호 ${w.runId})`,
            ),
          );
          return;
        }
        onDone(bus.id);
      } else {
        const created = await createBus(request);
        onDone(created.id);
      }
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
      // 경고가 떠 있다는 것은 수정이 이미 저장됐다는 뜻이다 — 어떻게 닫아도 목록이 새 값을 다시 받아야 한다.
      onClose={warnings.length > 0 ? () => onDone(bus?.id) : onClose}
      footer={
        warnings.length > 0 ? (
          <Button variant="primary" onClick={() => onDone(bus?.id)}>
            확인
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button variant="primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </>
        )
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
      {warnings.length > 0 ? (
        <>
          <AlertBanner tone="moving" title="수정은 반영됐지만 확인할 경고가 있습니다" />
          {warnings.map((message, index) => (
            <AlertBanner key={index} tone="moving" title={message} />
          ))}
        </>
      ) : null}
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
