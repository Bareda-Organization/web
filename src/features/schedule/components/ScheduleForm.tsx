"use client";

import { useState } from "react";
import { BusOptionsNotice, useBusOptions } from "@/features/bus";
import { runPerWeekday, WEEKDAY_OPTIONS } from "@/shared/lib/format/weekdayBatch";
import type { WeekdayOutcome } from "@/shared/lib/format/weekdayBatch";
import { AlertBanner, Button, Dialog, Drawer, Input, RunStatusChip, Select, StatusChip, Switch, WeekdayPicker } from "@/shared/ui";
import { todayInSeoul } from "@/shared/lib/format/dateTime";
import { formatClockTime } from "@/shared/lib/format/clockTime";
import { createSchedule, updateSchedule } from "../api";
import type { RunItemResponseTypes, ScheduleDirection, ScheduleItemResponseTypes, ScheduleWeekday } from "../types";
import { confirmTimeOf, formatDateWithWeekday, previewScheduleChange, WEEKDAY_LABEL } from "../lib/scheduleBoard";
import { describeScheduleFailure } from "./describeScheduleFailure";
import { StyledFormGrid, StyledPanelFootLeft, StyledPreviewRow, StyledPreviewSection } from "./ScheduleList.styled";

type ScheduleFormProps = {
  /** 있으면 수정, 없으면 등록. */
  schedule?: ScheduleItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
  /** 옆 패널 아래 [삭제] · [다른 요일에 복사] — 각 확인 창을 여는 일은 목록이 한다 */
  onDelete?: () => void;
  onCopy?: () => void;
  /** 오늘 회차 목록 — "이 수정이 반영되는 회차" 미리보기의 오늘 줄이 쓴다 */
  runs?: RunItemResponseTypes[];
  /** 오늘(`YYYY-MM-DD`) — 안 주면 한국 시간 기준 */
  today?: string;
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
export const ScheduleForm = ({ schedule, onClose, onDone, onDelete, onCopy, runs = [], today = todayInSeoul() }: ScheduleFormProps) => {
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

  const busSelect = (
    <>
      <Select
        label="차량"
        options={busOptions.options}
        value={busId ?? ""}
        onChange={(event) => setBusId(event.target.value)}
      />
      <BusOptionsNotice error={busOptions.error} hasMore={busOptions.hasMore} onRetry={busOptions.reload} />
    </>
  );
  const weekdayField = schedule ? (
    <Select
      label="요일"
      options={WEEKDAY_OPTIONS}
      value={weekday}
      onChange={(event) => setWeekday(event.target.value as ScheduleWeekday)}
    />
  ) : (
    <WeekdayPicker value={weekdays} onChange={setWeekdays} outcomes={outcomes} />
  );
  const directionSelect = (
    <Select
      label="방향"
      options={DIRECTION_OPTIONS}
      value={direction}
      onChange={(event) => setDirection(event.target.value as ScheduleDirection)}
    />
  );
  const departInput = (
    <Input
      label="출발 시각"
      required
      type="time"
      hint={departTime ? `확정 시각은 출발 30분 전(${confirmTimeOf(departTime)})` : undefined}
      value={departTime}
      onChange={(event) => setDepartTime(event.target.value)}
    />
  );
  const originInput = <Input label="출발지" required value={originName} onChange={(event) => setOriginName(event.target.value)} />;
  const destinationInput = <Input label="도착지" required value={destinationName} onChange={(event) => setDestinationName(event.target.value)} />;
  const durationInput = (
    <Input
      label="예상 소요시간"
      type="number"
      min={0}
      suffix="분"
      value={estDurationMin}
      onChange={(event) => setEstDurationMin(event.target.value)}
    />
  );
  const activeSwitch = <Switch label="활성" checked={active} onChange={(event) => setActive(event.target.checked)} />;
  const errorBanner = error ? <AlertBanner tone="missed" title={error} /> : null;

  if (!schedule) {
    return (
      <Dialog
        title="운행 스케줄 등록"
        width={480}
        showClose
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
        {busSelect}
        {weekdayField}
        {directionSelect}
        {departInput}
        {originInput}
        {destinationInput}
        {durationInput}
        {activeSwitch}
        {errorBanner}
      </Dialog>
    );
  }

  // 수정 옆 패널 — 이 수정이 어느 회차에 반영되는지(§5.10 Ruling 366 · 화면 계산 Ruling 827)를 저장 전에 보인다.
  const preview = previewScheduleChange(
    schedule,
    { weekday, direction, departTime, active, busId: busId ?? schedule.busId, originName: originName.trim(), destinationName: destinationName.trim(), estDurationMin: estDurationMin === "" ? null : Number(estDurationMin) },
    runs,
    today,
  );
  const tomorrowText = {
    none: `이 스케줄은 ${WEEKDAY_LABEL[weekday]}요일이라 내일 회차에는 영향이 없습니다`,
    same: "바뀌는 값이 없어 내일 회차는 그대로입니다",
    moved: "내일 회차가 새 값으로 바뀝니다(출발 시각 · 차량 · 출발지 · 도착지 · 소요 시간)",
    canceled: "내일 회차가 임시 취소됩니다",
    created: "내일 회차가 새로 만들어집니다",
  }[preview.tomorrow.kind];

  return (
    <Drawer
      title="운행 스케줄 수정"
      width={520}
      onClose={handleClose}
      footer={
        <StyledPanelFootLeft>
          {onDelete ? (
            <Button variant="dangerQuiet" icon="trash-2" onClick={onDelete} disabled={submitting}>
              삭제
            </Button>
          ) : null}
          <span />
          {onCopy ? (
            <Button variant="secondary" icon="copy" onClick={onCopy} disabled={submitting}>
              다른 요일에 복사
            </Button>
          ) : null}
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            {savedAny ? "닫기" : "취소"}
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? "저장 중..." : "저장"}
          </Button>
        </StyledPanelFootLeft>
      }
    >
      <StyledFormGrid>
        <div>{busSelect}</div>
        <div>{weekdayField}</div>
        <div>{directionSelect}</div>
        <div>{departInput}</div>
        <div>{originInput}</div>
        <div>{destinationInput}</div>
        <div>{durationInput}</div>
        <div>{activeSwitch}</div>
      </StyledFormGrid>

      <StyledPreviewSection aria-label="이 수정이 반영되는 회차">
        <h3>
          이 수정이 반영되는 회차 <small>저장 전 미리보기</small>
        </h3>
        <StyledPreviewRow>
          <span>오늘 {formatDateWithWeekday(today)}</span>
          <div>
            <StatusChip tone="off" marker={false}>
              그대로
            </StatusChip>{" "}
            {preview.today.runs.length > 0 ? (
              <>
                오늘 회차 {preview.today.runs.length}개({formatClockTime(preview.today.runs[0].departTime)} <RunStatusChip status={preview.today.runs[0].status} />)는 바뀌지 않습니다
              </>
            ) : (
              "오늘 회차는 바뀌지 않습니다"
            )}
          </div>
        </StyledPreviewRow>
        <StyledPreviewRow>
          <span>내일 {formatDateWithWeekday(preview.tomorrow.date)}</span>
          <div>{tomorrowText}</div>
        </StyledPreviewRow>
        <StyledPreviewRow>
          <span>
            다음 {WEEKDAY_LABEL[preview.next.weekday]}요일 {formatDateWithWeekday(preview.next.date).replace(/ \(.\)$/, "")}
          </span>
          <div>{preview.next.active ? `전날(${Number(preview.next.createdOn.slice(5, 7))}월 ${Number(preview.next.createdOn.slice(8, 10))}일) 00:05 에 새 값으로 회차가 만들어집니다` : "비활성이라 회차가 만들어지지 않습니다"}</div>
        </StyledPreviewRow>
      </StyledPreviewSection>

      <AlertBanner tone="moving" title="비활성으로 바꾸거나 요일 · 방향을 바꾸면">
        내일 이후 시작 전 회차는 취소 표시됩니다(오늘 회차는 그대로). 출발 시각·차량·출발지·도착지·소요 시간 수정은 그 회차에 옮겨집니다.
      </AlertBanner>
      {errorBanner}
    </Drawer>
  );
};
