"use client";

import { useState } from "react";
import { BusOptionsNotice, useBusOptions } from "@/features/bus";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Dialog, Input, Select, Switch } from "@/shared/ui";
import { createRoute, updateRoute } from "../api";
import type { RouteListItemResponseTypes, RunDirection, Weekday } from "../types";

type RouteFormProps = {
  /** 있으면 수정, 없으면 신규 편성. stop_ids 는 이 폼에서 다루지 않는다(RouteStopsPanel 몫). */
  route?: RouteListItemResponseTypes;
  onClose: () => void;
  onDone: () => void;
};

const WEEKDAY_OPTIONS: { value: Weekday; label: string }[] = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
];

const DIRECTION_OPTIONS: { value: RunDirection; label: string }[] = [
  { value: "to_academy", label: "등원" },
  { value: "from_academy", label: "하원" },
];

// §5.9 POST·PATCH /staff/routes(RTE-01) — 편성 등록·수정. bus_id·weekday·direction
// 조합이 UNIQUE 라(uk_route_bus_weekday_direction), 하나만 바꿔도 409 DUPLICATE_ROUTE 가 날 수 있다.
export const RouteForm = ({ route, onClose, onDone }: RouteFormProps) => {
  const [selectedBusId, setBusId] = useState<string | undefined>(route?.busId);
  const [weekday, setWeekday] = useState<Weekday>(route?.weekday ?? "mon");
  const [direction, setDirection] = useState<RunDirection>(route?.direction ?? "to_academy");
  const [name, setName] = useState(route?.name ?? "");
  const [active, setActive] = useState(route?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busOptions = useBusOptions(route ? { id: route.busId, busNo: route.busNo } : undefined);
  // 등록 폼은 목록의 첫 차량이 기본 선택이다.
  const busId = selectedBusId ?? busOptions.buses[0]?.id;

  const canSubmit = busId !== undefined && !submitting;

  const handleSubmit = async () => {
    if (busId === undefined) return;
    setSubmitting(true);
    setError(null);
    try {
      const request = { busId, weekday, direction, name: name.trim() || undefined, active };
      if (route) {
        await updateRoute(route.id, request);
      } else {
        await createRoute(request);
      }
      onDone();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "DUPLICATE_ROUTE") {
        setError("같은 차량·요일·방향의 편성이 이미 있습니다.");
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
        options={busOptions.options}
        value={busId ?? ""}
        onChange={(event) => setBusId(event.target.value)}
      />
      <BusOptionsNotice error={busOptions.error} hasMore={busOptions.hasMore} onRetry={busOptions.reload} />
      <Select
        label="요일"
        options={WEEKDAY_OPTIONS}
        value={weekday}
        onChange={(event) => setWeekday(event.target.value as Weekday)}
      />
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
