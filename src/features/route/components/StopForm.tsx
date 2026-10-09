"use client";

import type { ReactNode } from "react";
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
  /** 50m 안인지 가릴 기존 승하차지 후보 — 추가는 고른 후보 근처, 수정은 학원의 다른 승하차지 전체(못 읽었으면 고른 후보 근처만). 거리는 핀 기준으로 다시 잰다. */
  nearby: NearbyStopTypes[];
  onPick: (suggestion: StopSuggestionTypes) => void;
  onCancel: () => void;
  onApply: () => void;
  /** 지금 저장돼 있는(또는 방금 고른) 주소 — 수정 양식은 주소를 입력칸이 아니라 한 줄 글로 보여 준다. */
  address?: string;
  /** 적용 단추 글자 — 기본은 추가 "목록에 추가" · 수정 "적용". 서버에 바로 저장하는 화면은 "저장". */
  applyLabel?: string;
  /** 바뀐 것이 없거나 저장 중일 때 적용 단추를 끈다. */
  applyDisabled?: boolean;
  /**
   * 50m 안 기존 승하차지를 알릴 때 "저장하면 합쳐집니다" 라고 말할지. 노선 편성의 저장은 가까운 승하차지로 합치지만
   * 승하차지 관리의 수정(PATCH)은 합치지 않는다(§5.9 Ruling 849) — 그쪽은 false 로 "따로 남습니다" 라고 알린다.
   */
  mergesNearby?: boolean;
  /** 핀을 원래 자리로 되돌린다 — 주소를 고르면 핀도 따라 옮겨 가므로 좌표는 두고 이름·주소만 고치려는 길이다. 핀이 옮겨졌을 때만 단추가 보인다. */
  onResetPin?: () => void;
  /** 양식 맨 아래(단추 위) 안내·오류. */
  children?: ReactNode;
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
  address,
  applyLabel,
  applyDisabled = false,
  mergesNearby = true,
  onResetPin,
  children,
}: StopFormProps) => {
  const moved = pin && anchor ? metersBetween(pin, anchor) : 0;
  // 단추는 거리가 아니라 좌표로 가른다 — 0.5m 미만은 거리가 0 으로 반올림돼도 좌표는 달라 PATCH 에 position 이 실린다.
  const pinDiffers = pin !== null && anchor !== null && (pin.lat !== anchor.lat || pin.lng !== anchor.lng);
  // ⚠ 거리를 **옮긴 핀 기준으로 다시 잰다.** 서버가 준 거리는 후보 좌표 기준이라, 겹치지 않으려고 핀을
  // 옮긴 뒤에도 경고가 남으면 관계자의 판단을 흐린다.
  const overlapping = pin
    ? nearby
        .map((stop) => ({ ...stop, distanceM: metersBetween(pin, stop) }))
        .filter((stop) => stop.distanceM <= STOP_MERGE_RADIUS_METERS)
        .sort((left, right) => left.distanceM - right.distanceM)
    : [];
  const canApply = pin !== null && name.trim().length > 0 && !applyDisabled;

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

      {onResetPin && pinDiffers ? (
        <Button variant="ghost" size="sm" onClick={onResetPin}>
          핀 되돌리기
        </Button>
      ) : null}

      {address ? <StyledFormHint>주소 · {address}</StyledFormHint> : null}

      {overlapping.length > 0 ? (
        <AlertBanner
          tone="moving"
          title={
            mergesNearby
              ? `이 자리에 이미 "${overlapping[0].name}" 이(가) 있습니다 (${overlapping[0].distanceM}m) — 저장하면 그 승하차지로 합쳐집니다`
              : `이 자리 가까이(${overlapping[0].distanceM}m)에 "${overlapping[0].name}" 승하차지가 이미 있습니다 — 저장해도 합쳐지지 않고 따로 남습니다`
          }
        />
      ) : null}

      <Input label="표시명" value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={100} />

      {children}

      <StyledFormActions>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          취소
        </Button>
        <Button variant="primary" size="sm" onClick={onApply} disabled={!canApply}>
          {applyLabel ?? (mode === "add" ? "목록에 추가" : "적용")}
        </Button>
      </StyledFormActions>
    </StyledStopForm>
  );
};
