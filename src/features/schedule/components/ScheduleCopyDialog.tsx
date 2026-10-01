"use client";

import { useState } from "react";
import { runPerWeekday } from "@/shared/lib/format/weekdayBatch";
import type { WeekdayOutcome } from "@/shared/lib/format/weekdayBatch";
import { Button, Dialog, WeekdayPicker } from "@/shared/ui";
import { createSchedule } from "../api";
import type { ScheduleItemResponseTypes, ScheduleWeekday } from "../types";
import { describeScheduleFailure } from "./describeScheduleFailure";

type ScheduleCopyDialogProps = {
  schedule: ScheduleItemResponseTypes;
  onClose: () => void;
  // 고른 요일이 전부 만들어졌거나, 일부만 만들어진 채 닫을 때 부른다. 목록이 다시 읽는 데 쓴다.
  onDone: () => void;
};

// B1 #7 — 이 스케줄(차량·방향·출발 시각·출발지·도착지·소요시간)을 다른 요일로 복사한다.
// 요일마다 1건씩 만들며 한 요일이 실패해도 나머지는 이어 간다(Ruling 490).
export const ScheduleCopyDialog = ({ schedule, onClose, onDone }: ScheduleCopyDialogProps) => {
  const [weekdays, setWeekdays] = useState<ScheduleWeekday[]>([]);
  const [outcomes, setOutcomes] = useState<WeekdayOutcome<unknown>[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const savedAny = outcomes?.some((outcome) => outcome.failure === null) ?? false;

  const handleClose = () => (savedAny ? onDone() : onClose());

  const handleCopyClick = async () => {
    setSubmitting(true);
    const results = await runPerWeekday(
      weekdays,
      (weekday) =>
        createSchedule({
          busId: schedule.busId,
          weekday,
          direction: schedule.direction,
          departTime: schedule.departTime,
          originName: schedule.originName,
          destinationName: schedule.destinationName,
          estDurationMin: schedule.estDurationMin,
          active: schedule.active,
        }),
      describeScheduleFailure,
    );
    setSubmitting(false);
    const failed = results.filter((result) => result.failure !== null);
    if (failed.length === 0) {
      onDone();
      return;
    }
    // 실패한 요일만 골라 둔다 — 다시 누르면 그 요일만 다시 시도한다.
    setWeekdays(failed.map((result) => result.weekday));
    setOutcomes(results);
  };

  return (
    <Dialog
      title="다른 요일에 복사"
      width={480}
      onClose={handleClose}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            {savedAny ? "닫기" : "취소"}
          </Button>
          <Button variant="primary" disabled={weekdays.length === 0 || submitting} onClick={handleCopyClick}>
            {submitting ? "복사 중..." : "복사"}
          </Button>
        </>
      }
    >
      <p>
        {schedule.busNo} · {schedule.departTime} 스케줄을 고른 요일에 같은 내용으로 만듭니다.
      </p>
      <WeekdayPicker
        label="복사할 요일"
        value={weekdays}
        onChange={setWeekdays}
        disabledWeekdays={[schedule.weekday]}
        outcomes={outcomes}
      />
    </Dialog>
  );
};
