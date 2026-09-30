"use client";

import { useState } from "react";
import { BusOptionsNotice, useBusOptions } from "@/features/bus";
import { runPerWeekday, WEEKDAY_OPTIONS } from "@/shared/lib/format/weekdayBatch";
import type { WeekdayOutcome } from "@/shared/lib/format/weekdayBatch";
import { AlertBanner, Button, Dialog, Input, Select, Switch, WeekdayPicker } from "@/shared/ui";
import { createSchedule, updateSchedule } from "../api";
import type { ScheduleDirection, ScheduleItemResponseTypes, ScheduleWeekday } from "../types";
import { describeScheduleFailure } from "./describeScheduleFailure";

type ScheduleFormProps = {
  /** 있으면 수정, 없으면 등록. */
  schedule?: ScheduleItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

const DIRECTION_OPTIONS: { value: ScheduleDirection; label: string }[] = [
  { value: "to_academy", label: "등원" },
  { value: "from_academy", label: "하원" },
];

// §5.10 POST·PATCH /staff/schedules(SCH-01) — 정규 스케줄 등록·수정. bus_id·weekday·
// direction·depart_time 넷이 유일성 조합이라(§5.10 본문), 하나만 바꿔도
// 409 DUPLICATE_SCHEDULE 이 날 수 있다(route 편성의 uk_route_bus_weekday_direction 과
// 같은 형태이나 이쪽은 depart_time 까지 넷을 묶는다는 점이 다르다).
// 등록은 요일을 여러 개 고를 수 있다(요일마다 1건씩 만든다). 수정은 그 스케줄 하나라 요일 하나만 고른다.
export const ScheduleForm = ({ schedule, onClose, onDone }: ScheduleFormProps) => {
  const [selectedBusId, setBusId] = useState<string | undefined>(schedule?.busId);
  const [weekday, setWeekday] = useState<ScheduleWeekday>(schedule?.weekday ?? "mon");
  const [weekdays, setWeekdays] = useState<ScheduleWeekday[]>(["mon"]);
  const [outcomes, setOutcomes] = useState<WeekdayOutcome<unknown>[] | null>(null);
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

  const busOptions = useBusOptions(schedule ? { id: schedule.busId, busNo: schedule.busNo } : undefined);
  // 등록 폼은 목록의 첫 차량이 기본 선택이다.
  const busId = selectedBusId ?? busOptions.buses[0]?.id;

  const savedAny = outcomes?.some((outcome) => outcome.failure === null) ?? false;
  // 일부 요일이 저장된 뒤 닫으면 목록이 새로 읽어야 만든 스케줄이 보인다.
  const handleClose = () => (savedAny ? onDone() : onClose());

  const canSubmit =
    busId !== undefined &&
    (schedule !== undefined || weekdays.length > 0) &&
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
        direction,
        departTime,
        originName: originName.trim(),
        destinationName: destinationName.trim(),
        // 수정에서 비우면 null 로 보내 서버 값을 지운다(Ruling 390) — 등록은 키를 뺀다.
        estDurationMin: estDurationMin === "" ? (schedule ? null : undefined) : Number(estDurationMin),
        active,
      };
      if (schedule) {
        await updateSchedule(schedule.id, { ...request, weekday });
        onDone();
      } else {
        const results = await runPerWeekday(weekdays, (day) => createSchedule({ ...request, weekday: day }), describeScheduleFailure);
        const failed = results.filter((result) => result.failure !== null);
        if (failed.length === 0) {
          onDone();
        } else if (results.length === 1) {
          setError(failed[0].failure);
        } else {
          // 실패한 요일만 골라 둔다 — 다시 저장하면 그 요일만 다시 시도한다.
          setWeekdays(failed.map((result) => result.weekday));
          setOutcomes(results);
        }
      }
    } catch (cause) {
      setError(describeScheduleFailure(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={schedule ? "운행 스케줄 수정" : "운행 스케줄 등록"}
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            {savedAny ? "닫기" : "취소"}
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? "저장 중..." : "저장"}
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
      {schedule ? (
        <Select
          label="요일"
          options={WEEKDAY_OPTIONS}
          value={weekday}
          onChange={(event) => setWeekday(event.target.value as ScheduleWeekday)}
        />
      ) : (
        <WeekdayPicker value={weekdays} onChange={setWeekdays} outcomes={outcomes} />
      )}
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
      {schedule ? (
        <p>
          비활성으로 바꾸거나 요일·방향을 바꾸면 내일 이후 시작 전 회차는 취소 표시됩니다(오늘 회차는 그대로). 출발 시각·차량·출발지·도착지·소요
          시간 수정은 그 회차에 옮겨집니다.
        </p>
      ) : null}
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
