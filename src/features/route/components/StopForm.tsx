"use client";

import { AlertBanner, Button, Input } from "@/shared/ui";
import type { NearbyStopTypes, StopSuggestionTypes } from "../types";
import { StopAddressSearch } from "./StopAddressSearch";
import { StyledFormActions, StyledFormHint, StyledFormTitle, StyledStopForm } from "./StopForm.styled";

// 백엔드 `StopProximity.MERGE_RADIUS_METERS` 와 같은 값 — 이 안이면 저장해도 기존 승하차지에 붙는다.
const STOP_MERGE_RADIUS_METERS = 50;

type Point = { lat: number; lng: number };

type StopFormProps = {
  mode: "add" | "edit";
  name: string;
  onNameChange: (name: string) => void;
  /** 지금 핀이 가리키는 자리 — 추가는 후보를 고르기 전까지 없다. */
  pin: Point | null;
  /** 옮긴 거리를 잴 기준 — 추가는 고른 후보, 수정은 원래 자리. */
  anchor: Point | null;
  /** 고른 후보 근처(50m)의 기존 승하차지 — 수정 양식에서 주소를 다시 고르지 않았으면 비어 있다. */
  nearby: NearbyStopTypes[];
  onPick: (suggestion: StopSuggestionTypes) => void;
  onCancel: () => void;
  onApply: () => void;
};

// 두 좌표 사이 거리(m) — 평면 근사다. 판정 범위가 수십~수백 m 라 곡률 오차가 보이지 않는다
// (백엔드 `StopProximity.metersBetween` 과 같은 규칙·같은 상수).
const metersBetween = (a: Point, b: Point): number =>
  Math.round(Math.hypot((a.lat - b.lat) * 111_320, (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180)));

/**
 * 승하차지 추가·수정 양식(2026-09-23 사용자 지시) — 주소 검색은 이 양식 안에만 있다(지시 10).
 *
 * <p>여기서 "적용" 해도 서버에는 아직 안 간다 — 목록에만 반영되고 저장 버튼이 한 번에 보낸다(지시 7).
 * 자리는 지도의 핀을 끌어 정한다(지시 3). 지오코딩이 주는 점은 건물 중심이라 버스가 서는 모퉁이와 다르다.
 */
export const StopForm = ({
  mode,
  name,
  onNameChange,
  pin,
  anchor,
  nearby,
  onPick,
  onCancel,
  onApply,
}: StopFormProps) => {
  const moved = pin && anchor ? metersBetween(pin, anchor) : 0;
  // ⚠ 거리를 **옮긴 핀 기준으로 다시 잰다.** 서버가 준 거리는 후보 좌표 기준이라, 겹치지 않으려고 핀을
  // 옮긴 뒤에도 경고가 남으면 관계자의 판단을 흐린다.
  const overlapping = pin
    ? nearby
        .map((stop) => ({ ...stop, distanceM: metersBetween(pin, stop) }))
        .filter((stop) => stop.distanceM <= STOP_MERGE_RADIUS_METERS)
        .sort((left, right) => left.distanceM - right.distanceM)
    : [];
  const canApply = pin !== null && name.trim().length > 0;

  return (
    <StyledStopForm aria-label={mode === "add" ? "승하차지 추가" : "승하차지 수정"}>
      <StyledFormTitle>{mode === "add" ? "승하차지 추가" : "승하차지 수정"}</StyledFormTitle>

      <StopAddressSearch onPick={onPick} />

      {pin ? (
        <StyledFormHint>
          지도의 핀을 끌어 버스가 실제로 서는 자리(블록 모퉁이·도로가)에 놓으세요
          {moved > 0 ? ` · ${mode === "add" ? "검색 위치" : "원래 자리"}에서 약 ${moved}m 옮김` : ""}
        </StyledFormHint>
      ) : (
        <StyledFormHint>주소를 검색해 후보를 고르면 지도에 핀이 찍힙니다</StyledFormHint>
      )}

      {overlapping.length > 0 ? (
        <AlertBanner
          tone="moving"
          title={`이 자리에 이미 "${overlapping[0].name}" 이(가) 있습니다 (${overlapping[0].distanceM}m) — 저장하면 그 승하차지로 합쳐집니다`}
        />
      ) : null}

      <Input label="표시명" value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={100} />

      <StyledFormActions>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button variant="primary" size="sm" onClick={onApply} disabled={!canApply}>
          {mode === "add" ? "목록에 추가" : "적용"}
        </Button>
      </StyledFormActions>
    </StyledStopForm>
  );
};
