"use client";

import { useState } from "react";
import { runPerWeekday } from "@/shared/lib/format/weekdayBatch";
import type { WeekdayOutcome } from "@/shared/lib/format/weekdayBatch";
import { Button, Dialog, WeekdayPicker } from "@/shared/ui";
import { createRoute } from "../api";
import type { RouteDetailResponseTypes, Weekday } from "../types";
import { describeRouteFailure } from "./describeRouteFailure";

type RouteCopyDialogProps = {
  route: RouteDetailResponseTypes;
  onClose: () => void;
  // 고른 요일이 전부 만들어졌거나, 일부만 만들어진 채 닫을 때 부른다. 목록·상세가 다시 읽는 데 쓴다.
  onDone: () => void;
};

// B1 #7 — 이 노선(차량·방향·이름·활성·정차 순서)을 다른 요일로 복사한다. 정차지는 요일 사이에 공유되는
// 승하차지 기록이라 새로 만들지 않고 같은 stop_id 순서를 그대로 잇는다. 요일마다 1건씩 만들며 한 요일이 실패해도
// 나머지는 이어 간다(Ruling 490).
export const RouteCopyDialog = ({ route, onClose, onDone }: RouteCopyDialogProps) => {
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [outcomes, setOutcomes] = useState<WeekdayOutcome<unknown>[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const savedAny = outcomes?.some((outcome) => outcome.failure === null) ?? false;

  const handleClose = () => (savedAny ? onDone() : onClose());

  const handleCopyClick = async () => {
    setSubmitting(true);
    const results = await runPerWeekday(
      weekdays,
      (weekday) =>
        createRoute({
          busId: route.busId,
          weekday,
          direction: route.direction,
          name: route.name ?? undefined,
          active: route.active,
          stopIds: route.stops.map((stop) => stop.stopId),
        }),
      describeRouteFailure,
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
        {route.busNo} · 정차지 {route.stops.length}곳을 고른 요일에 같은 순서로 만듭니다.
      </p>
      <WeekdayPicker
        label="복사할 요일"
        value={weekdays}
        onChange={setWeekdays}
        disabledWeekdays={[route.weekday]}
        outcomes={outcomes}
      />
    </Dialog>
  );
};
