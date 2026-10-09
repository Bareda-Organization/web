"use client";

import { useState } from "react";
import { MapSurface } from "@/features/map";
import type { MapMarker } from "@/features/map";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Dialog } from "@/shared/ui";
import { updateStop } from "../api";
import type { LatLng, StopListItemTypes, StopSuggestionTypes, StopUpdateRequestTypes } from "../types";
import { StopForm } from "./StopForm";
import { StyledFormHint } from "./StopForm.styled";
import { StyledEditBody, StyledPinMap } from "./StopManagement.styled";

// 자리를 고르는 동안의 배율 — 건물·골목이 갈리는 수준이어야 "그 블록 모퉁이" 를 찍을 수 있다(편성 화면과 같은 값).
const PIN_MAP_ZOOM = 18;
const PIN_MARKER_ID = "draft-stop";

// §5.9 403 CHANGE_WINDOW_CLOSED — 운행 중(`moving`) 회차의 현재 노선에 서는 승하차지는 좌표를 고칠 수 없다(이름·주소만은 허용).
const CHANGE_WINDOW_CLOSED_MESSAGE =
  "운행 중인 회차가 서는 승하차지라 위치를 지금 옮길 수 없습니다 — 이름·주소만 고치거나 운행이 끝난 뒤 다시 저장하세요";

type StopEditDialogProps = {
  stop: StopListItemTypes;
  onClose: () => void;
  onSaved: (saved: StopListItemTypes) => void;
  /** 404 STOP_NOT_FOUND — 그 사이 없어졌거나 다른 학원의 승하차지다. */
  onMissing: () => void;
};

// 원래 값과 다른 필드만 담는다 — PATCH 는 보낸 필드만 고치고, 좌표는 둘 다 주거나 둘 다 비워야 한다(§5.9).
const changesOf = (stop: StopListItemTypes, name: string, address: string, pin: LatLng): StopUpdateRequestTypes => ({
  ...(name.trim() !== stop.name ? { name: name.trim() } : {}),
  ...(address !== stop.address ? { address } : {}),
  ...(pin.lat !== stop.lat || pin.lng !== stop.lng ? { position: pin } : {}),
});

/**
 * 승하차지 수정 대화상자(Ruling 849) — 노선 편성 화면의 승하차지 양식(`StopForm`)을 그대로 쓰되, 이 화면의 저장은
 * 목록에 모아 두지 않고 `PATCH /staff/stops/{id}` 로 바로 간다. 고친 값은 그 승하차지를 쓰는 모든 노선의 표시에 반영되고 학생의 요일별 주소(사본)는 바뀌지 않는다.
 */
export const StopEditDialog = ({ stop, onClose, onSaved, onMissing }: StopEditDialogProps) => {
  const original = { lat: stop.lat, lng: stop.lng };
  const [name, setName] = useState(stop.name);
  const [address, setAddress] = useState(stop.address);
  const [pin, setPin] = useState<LatLng>(original);
  // 카메라는 후보를 고를 때만 옮긴다 — 핀을 끌 때마다 따라가면 끌던 핀이 제자리로 돌아간다.
  const [focus, setFocus] = useState<LatLng>(original);
  const [nearby, setNearby] = useState<StopSuggestionTypes["nearby"]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changes = changesOf(stop, name, address, pin);
  const changed = Object.keys(changes).length > 0;

  const pickSuggestion = (suggestion: StopSuggestionTypes) => {
    const point = { lat: suggestion.lat, lng: suggestion.lng };
    // 수정은 관계자가 붙인 이름을 지우지 않는다 — 주소와 자리만 후보로 바꾼다.
    setAddress(suggestion.displayName);
    setPin(point);
    setFocus(point);
    // 후보 근처에는 이 승하차지 자신도 걸린다 — 자기 자신은 "이미 있는 승하차지" 가 아니다.
    setNearby(suggestion.nearby.filter((candidate) => candidate.stopId !== stop.stopId));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(await updateStop(stop.stopId, changes));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "STOP_NOT_FOUND") {
        onMissing();
        return;
      }
      // 입력한 값은 그대로 둔다 — 고쳐서 다시 저장할 수 있어야 한다(서버는 아무것도 안 바꿨다).
      setError(
        cause instanceof ApiError && cause.code === "CHANGE_WINDOW_CLOSED"
          ? CHANGE_WINDOW_CLOSED_MESSAGE
          : cause instanceof ApiError
            ? cause.message
            : "저장하지 못했습니다",
      );
    } finally {
      setSaving(false);
    }
  };

  const markers: MapMarker[] = [{ id: PIN_MARKER_ID, lat: pin.lat, lng: pin.lng, kind: "stop", selected: true, draggable: true }];

  return (
    <Dialog open aria-label="승하차지 수정" width={920} onClose={onClose}>
      <StyledEditBody>
        <StopForm
          mode="edit"
          name={name}
          onNameChange={setName}
          pin={pin}
          anchor={original}
          nearby={nearby}
          onPick={pickSuggestion}
          onCancel={onClose}
          onApply={save}
          address={address}
          applyLabel={saving ? "저장 중..." : "저장"}
          applyDisabled={!changed || saving}
          mergesNearby={false}
        >
          <StyledFormHint>이 승하차지를 쓰는 모든 노선의 표시에 함께 반영됩니다 — 학생의 요일별 주소는 바뀌지 않습니다</StyledFormHint>
          {error ? <AlertBanner tone="missed" title={error} role="alert" /> : null}
        </StopForm>
        <StyledPinMap>
          <MapSurface
            camera={{ ...focus, zoom: PIN_MAP_ZOOM }}
            markers={markers}
            fitToContent={false}
            onMarkerDragEnd={(markerId, point) => markerId === PIN_MARKER_ID && setPin(point)}
          />
        </StyledPinMap>
      </StyledEditBody>
    </Dialog>
  );
};
