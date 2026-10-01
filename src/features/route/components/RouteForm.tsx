"use client";

import { useState } from "react";
import { BusOptionsNotice, useBusOptions } from "@/features/bus";
import { runPerWeekday, WEEKDAY_OPTIONS } from "@/shared/lib/format/weekdayBatch";
import type { WeekdayOutcome } from "@/shared/lib/format/weekdayBatch";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, Select, Switch, WeekdayPicker } from "@/shared/ui";
import { createRoute, updateRoute } from "../api";
import type { RouteListItemResponseTypes, RunDirection, Weekday } from "../types";
import { describeRouteFailure, DUPLICATE_ROUTE_MESSAGE } from "./describeRouteFailure";

type RouteFormProps = {
  /** 있으면 수정, 없으면 신규 편성. stop_ids 는 이 폼에서 다루지 않는다(RouteStopsPanel 몫). */
  route?: RouteListItemResponseTypes;
  onClose: () => void;
  // 등록이면 만든 편성의 id 를 넘긴다(목록이 상세로 이어 주는 데 쓴다). 수정이면 그 편성의 id.
  onDone: (saved: { id: string }) => void;
  // 등록에서 요일을 둘 이상 골라 저장했을 때(B1 #7) — 일부만 저장됐어도 닫을 때 부른다. 목록이 다시 읽는 데 쓴다.
  onBatchDone?: () => void;
};

const DIRECTION_OPTIONS: { value: RunDirection; label: string }[] = [
  { value: "to_academy", label: "등원" },
  { value: "from_academy", label: "하원" },
];

// §5.9 POST·PATCH /staff/routes(RTE-01) — 편성 등록·수정. bus_id·weekday·direction
// 조합이 UNIQUE 라(uk_route_bus_weekday_direction), 하나만 바꿔도 409 DUPLICATE_ROUTE 가 날 수 있다.
// 등록은 요일을 여러 개 고를 수 있다(요일마다 1건씩 만든다). 수정은 그 편성 하나라 요일 하나만 고른다.
export const RouteForm = ({ route, onClose, onDone, onBatchDone }: RouteFormProps) => {
  const [selectedBusId, setBusId] = useState<string | undefined>(route?.busId);
  const [weekday, setWeekday] = useState<Weekday>(route?.weekday ?? "mon");
  const [weekdays, setWeekdays] = useState<Weekday[]>(["mon"]);
  const [outcomes, setOutcomes] = useState<WeekdayOutcome<{ id: string }>[] | null>(null);
  const [direction, setDirection] = useState<RunDirection>(route?.direction ?? "to_academy");
  const [name, setName] = useState(route?.name ?? "");
  const [active, setActive] = useState(route?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busOptions = useBusOptions(route ? { id: route.busId, busNo: route.busNo } : undefined);
  // 등록 폼은 목록의 첫 차량이 기본 선택이다.
  const busId = selectedBusId ?? busOptions.buses[0]?.id;

  const canSubmit = busId !== undefined && (route !== undefined || weekdays.length > 0) && !submitting;
  const savedAny = outcomes?.some((outcome) => outcome.failure === null) ?? false;

  // 일부 요일이 저장된 뒤 닫으면 목록이 새로 읽어야 만든 편성이 보인다.
  const handleClose = () => (savedAny ? onBatchDone?.() : onClose());

  const handleCreateWeekdays = async (request: { busId: string; direction: RunDirection; name?: string; active: boolean }) => {
    const results = await runPerWeekday(weekdays, async (day) => createRoute({ ...request, weekday: day }), describeRouteFailure);
    const failed = results.filter((result) => result.failure !== null);
    if (failed.length === 0 && results.length === 1) {
      onDone({ id: results[0].result!.id });
    } else if (failed.length === 0) {
      onBatchDone?.();
    } else if (results.length === 1) {
      setError(failed[0].failure);
    } else {
      // 실패한 요일만 골라 둔다 — 다시 저장하면 그 요일만 다시 시도한다.
      setWeekdays(failed.map((result) => result.weekday));
      setOutcomes(results);
    }
  };

  const handleSubmit = async () => {
    if (busId === undefined) return;
    setSubmitting(true);
    setError(null);
    try {
      // PATCH 는 키가 없으면 그대로 둔다 — 지운 이름은 빈 문자열로 보내야 서버 값이 지워진다(원래 이름이 있던 수정에서만).
      const request = { busId, direction, name: name.trim() || (route?.name ? "" : undefined), active };
      if (route) {
        const saved = await updateRoute(route.id, { ...request, weekday });
        onDone({ id: saved.id });
      } else {
        await handleCreateWeekdays(request);
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "DUPLICATE_ROUTE") {
        setError(DUPLICATE_ROUTE_MESSAGE);
      } else {
        setError(cause instanceof ApiError ? cause.message : "편성 저장에 실패했습니다");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title={route ? "노선 편성 수정" : "노선 편성 등록"}
      width={480}
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
      {route ? (
        <Select
          label="요일"
          options={WEEKDAY_OPTIONS}
          value={weekday}
          onChange={(event) => setWeekday(event.target.value as Weekday)}
        />
      ) : (
        <WeekdayPicker value={weekdays} onChange={setWeekdays} outcomes={outcomes} />
      )}
      <Select
        label="방향"
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={(event) => setDirection(event.target.value as RunDirection)}
      />
      <Input label="편성 이름" value={name} onChange={(event) => setName(event.target.value)} />
      <Switch checked={active} onChange={(event) => setActive(event.target.checked)} label="활성" />
      {error ? <AlertBanner tone="missed" title={error} /> : null}
    </Dialog>
  );
};
