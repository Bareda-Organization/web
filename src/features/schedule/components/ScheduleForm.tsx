"use client";

import { useEffect, useState } from "react";
import { getBuses } from "@/features/bus";
import type { BusItemResponseTypes } from "@/features/bus";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, Select, Switch } from "@/shared/ui";
import { createSchedule, updateSchedule } from "../api";
import type { ScheduleDirection, ScheduleItemResponseTypes, ScheduleWeekday } from "../types";

type ScheduleFormProps = {
  /** 있으면 수정, 없으면 등록. */
  schedule?: ScheduleItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

const WEEKDAY_OPTIONS: { value: ScheduleWeekday; label: string }[] = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
];

const DIRECTION_OPTIONS: { value: ScheduleDirection; label: string }[] = [
  { value: "to_academy", label: "등원" },
  { value: "from_academy", label: "하원" },
];

// §5.10 POST·PATCH /staff/schedules(SCH-01) — 정규 스케줄 등록·수정. bus_id·weekday·
// direction·depart_time 넷이 유일성 조합이라(§5.10 본문), 하나만 바꿔도
// 409 DUPLICATE_SCHEDULE 이 날 수 있다(route 편성의 uk_route_bus_weekday_direction 과
// 같은 형태이나 이쪽은 depart_time 까지 넷을 묶는다는 점이 다르다).
export const ScheduleForm = ({ schedule, onClose, onDone }: ScheduleFormProps) => {
  const [buses, setBuses] = useState<BusItemResponseTypes[]>([]);
  const [busId, setBusId] = useState<string | undefined>(schedule?.busId);
  const [weekday, setWeekday] = useState<ScheduleWeekday>(schedule?.weekday ?? "mon");
  const [direction, setDirection] = useState<ScheduleDirection>(schedule?.direction ?? "to_academy");
  const [departTime, setDepartTime] = useState(schedule?.departTime ?? "");
  const [originName, setOriginName] = useState(schedule?.originName ?? "");
  const [destinationName, setDestinationName] = useState(schedule?.destinationName ?? "");
  const [estDurationMin, setEstDurationMin] = useState(
    schedule?.estDurationMin != null ? String(schedule.estDurationMin) : "",
  );
  const [active, setActive] = useState(schedule?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // route 편성 폼과 같은 가정(§2 확신 없는 지점 인계) — 학원당 차량이 100대를
        // 넘으면 검색형 Select 로 바꿔야 한다.
        const data = await getBuses(0, 100);
        setBuses(data.items);
        if (busId === undefined && data.items.length > 0) {
          setBusId(data.items[0].id);
        }
      } catch {
        // 차량 목록 실패는 이 폼의 본체가 아니다 — 조용히 빈 목록으로 둔다.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const request = {
        busId,
        weekday,
        direction,
        departTime,
        originName: originName.trim(),
        destinationName: destinationName.trim(),
        estDurationMin: estDurationMin === "" ? undefined : Number(estDurationMin),
        active,
      };
      if (schedule) {
        await updateSchedule(schedule.id, request);
      } else {
        await createSchedule(request);
      }
      onDone();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "DUPLICATE_SCHEDULE") {
        setError("같은 차량·요일·방향·출발 시각의 스케줄이 이미 있습니다.");
      } else {
        setError(cause instanceof ApiError ? cause.message : "스케줄 저장에 실패했습니다");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={schedule ? "운행 스케줄 수정" : "운행 스케줄 등록"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </>
      }
    >
      <Select
        label="차량"
        options={buses.map((bus) => ({ value: String(bus.id), label: `${bus.busNo} (${bus.plateNo})` }))}
        value={busId ?? ""}
        onChange={(event) => setBusId(event.target.value)}
      />
      <Select
        label="요일"
        options={WEEKDAY_OPTIONS}
        value={weekday}
        onChange={(event) => setWeekday(event.target.value as ScheduleWeekday)}
      />
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
      <Switch label="활성" checked={active} onChange={(event) => setActive(event.target.checked)} />
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
