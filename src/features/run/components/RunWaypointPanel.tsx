"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertBanner, Button, Card, Input, Select } from "@/shared/ui";
import { StopAddressSearch, getRunRoute, type RouteStop, type StopSuggestionTypes } from "@/features/route";
import { deleteWaypoint, postWaypoint } from "../api";
import { describeWaypointFailure } from "../lib/waypointErrors";
import type { WaypointRequestTypes, WaypointResponseTypes } from "../types";
import { WaypointPreviewCompare } from "./WaypointPreviewCompare";
import {
  StyledActions,
  StyledFieldLabel,
  StyledHint,
  StyledWaypointForm,
  StyledWaypointHead,
  StyledWaypointList,
  StyledWaypointPanel,
  StyledWaypointRow,
} from "./RunWaypointPanel.styled";

// §5.15 label 은 100자까지 — 넘으면 서버가 422 로 거부한다.
const LABEL_MAX_LENGTH = 100;
const SLOT_END = "end";

// 미리보기를 만든 요청 — [배포] 는 이 요청에 토큰만 더해 그대로 다시 보낸다(서버도 미리보기의 지점 · 자리를 쓴다).
type PendingChange =
  | { kind: "add"; request: Omit<WaypointRequestTypes, "apply" | "previewToken"> }
  | { kind: "delete"; waypointId: string; name: string };

type RunWaypointPanelProps = {
  runId: string;
  onClose: () => void;
  /** 경유 지점이 배포되어 확정 노선이 바뀐 뒤 — 부모가 지도 · 명단을 다시 읽는다. */
  onChanged: () => void;
};

/**
 * §5.15 경유 지점 지정(RTE-10, A-15, Ruling 893) — 오늘 운행 상세 안의 패널.
 *
 * <p>흐름: 주소 검색 → [미리보기](apply=false, 확정 노선 불변) → 전후 비교 확인 → [배포](apply=true + preview_token).
 * 삭제도 같은 미리보기 → 배포다. 미리보기 없이는 [배포] 가 나타나지 않는다. 마감(403)은 화면이 시계로 따지지 않고 서버 응답으로 안내한다.
 */
export const RunWaypointPanel = ({ runId, onClose, onChanged }: RunWaypointPanelProps) => {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<StopSuggestionTypes | null>(null);
  const [label, setLabel] = useState("");
  const [slot, setSlot] = useState(SLOT_END);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [preview, setPreview] = useState<WaypointResponseTypes | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRoute = useCallback(async () => {
    try {
      const route = await getRunRoute(runId);
      setStops(route.stops);
    } catch (cause) {
      setError(describeWaypointFailure(cause).message);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    (async () => {
      await loadRoute();
    })();
  }, [loadRoute]);

  const waypoints = stops.filter((stop) => stop.isWaypoint && stop.waypointId);
  // 서버가 받는 설 자리는 1 ~ (학원을 뺀 정차지 수 + 1) — 그 범위만 고르게 해 422 를 화면에서 막는다.
  const slotOptions = useMemo(() => {
    const ordered = stops.filter((stop) => !stop.isDestination);
    const options: { value: string; label: string }[] = ordered.length > 0 ? [{ value: "1", label: "맨 앞" }] : [];
    ordered.slice(0, -1).forEach((stop, index) => options.push({ value: String(index + 2), label: `${stop.name} 다음` }));
    options.push({ value: SLOT_END, label: "맨 뒤 (기본)" });
    return options;
  }, [stops]);

  const fail = (cause: unknown) => {
    const failure = describeWaypointFailure(cause);
    setError(failure.message);
    // 낡은 미리보기는 버리고 입력은 둔다 — 다시 [미리보기] 를 누르면 된다.
    if (failure.redoPreview) {
      setPreview(null);
      setPending((current) => (current?.kind === "add" ? current : null));
    }
    if (failure.reload) void loadRoute();
  };

  const pick = (suggestion: StopSuggestionTypes) => {
    setPicked(suggestion);
    setLabel((suggestion.placeName ?? suggestion.displayName).slice(0, LABEL_MAX_LENGTH));
  };

  const discardPreview = () => {
    setPreview(null);
    setPending(null);
  };

  const previewAdd = async () => {
    if (!picked || !label.trim()) return;
    const request = {
      address: picked.displayName,
      lat: picked.lat,
      lng: picked.lng,
      label: label.trim(),
      ...(slot === SLOT_END ? {} : { seq: Number(slot) }),
    };
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setPreview(await postWaypoint(runId, { ...request, apply: false }));
      setPending({ kind: "add", request });
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy(false);
    }
  };

  const previewDelete = async (waypointId: string, name: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setPreview(await deleteWaypoint(runId, waypointId, { apply: false }));
      setPending({ kind: "delete", waypointId, name });
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy(false);
    }
  };

  const deploy = async () => {
    if (!pending || !preview?.previewToken) return;
    setBusy(true);
    setError(null);
    try {
      if (pending.kind === "add") {
        await postWaypoint(runId, { ...pending.request, apply: true, previewToken: preview.previewToken });
        setPicked(null);
        setLabel("");
        setSlot(SLOT_END);
      } else {
        await deleteWaypoint(runId, pending.waypointId, { apply: true, previewToken: preview.previewToken });
      }
      setNotice(pending.kind === "add" ? "경유 지점을 배포했어요 — 기사 · 동승자에게 알림을 보냈어요" : "경유 지점을 삭제하고 노선을 다시 배포했어요 — 기사 · 동승자에게 알림을 보냈어요");
      discardPreview();
      await loadRoute();
      onChanged();
    } catch (cause) {
      fail(cause);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <StyledWaypointPanel aria-label="경유 지점">
        <StyledWaypointHead>
          <h2>경유 지점</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Button>
        </StyledWaypointHead>
        {error ? <AlertBanner tone="missed" title={error} /> : null}
        {notice ? <AlertBanner tone="boarded" title={notice} /> : null}

        <div>
          <StyledFieldLabel>배포된 경유 지점</StyledFieldLabel>
          {loading ? (
            <StyledHint>불러오는 중…</StyledHint>
          ) : waypoints.length === 0 ? (
            <StyledHint>아직 정한 경유 지점이 없어요</StyledHint>
          ) : (
            <StyledWaypointList>
              {waypoints.map((stop) => (
                <StyledWaypointRow key={stop.waypointId}>
                  <span>
                    {stop.seq}. {stop.name}
                  </span>
                  <Button
                    variant="ghostDanger"
                    size="sm"
                    disabled={busy || preview != null}
                    aria-label={`${stop.name} 삭제`}
                    onClick={() => void previewDelete(stop.waypointId as string, stop.name)}
                  >
                    삭제
                  </Button>
                </StyledWaypointRow>
              ))}
            </StyledWaypointList>
          )}
        </div>

        {pending?.kind === "delete" ? null : (
          <StyledWaypointForm>
            <StyledFieldLabel>경유 지점 추가</StyledFieldLabel>
            <StopAddressSearch onPick={pick} />
            <StyledHint>{picked ? `선택한 주소: ${picked.displayName}` : "검색한 뒤 후보에서 주소를 골라 주세요"}</StyledHint>
            <Input
              label="표시명 (기사 화면에 보여요)"
              value={label}
              maxLength={LABEL_MAX_LENGTH}
              disabled={!picked}
              onChange={(event) => setLabel(event.target.value)}
            />
            <Select label="넣을 자리" value={slot} options={slotOptions} onChange={(event) => setSlot(event.target.value)} />
            <StyledActions>
              <Button variant="secondary" disabled={!picked || !label.trim() || busy || preview != null} onClick={() => void previewAdd()}>
                미리보기
              </Button>
            </StyledActions>
          </StyledWaypointForm>
        )}

        {preview && pending ? (
          <div>
            <StyledFieldLabel>{pending.kind === "delete" ? `${pending.name} 삭제 미리보기` : "추가 미리보기"}</StyledFieldLabel>
            <WaypointPreviewCompare preview={preview} />
            <StyledActions>
              <Button variant="primary" disabled={busy || !preview.previewToken} onClick={() => void deploy()}>
                배포
              </Button>
              <Button variant="ghost" disabled={busy} onClick={discardPreview}>
                미리보기 닫기
              </Button>
              <StyledHint>배포하면 기사 · 동승자에게 알림이 가요</StyledHint>
            </StyledActions>
          </div>
        ) : null}
      </StyledWaypointPanel>
    </Card>
  );
};
