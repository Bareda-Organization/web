"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, Input } from "@/shared/ui";
import { addRouteStop, getRouteDetail, optimizeRoute, searchStopAddress, updateRoute } from "../api";
import type { RouteStop, StopSearchResultTypes } from "../types";
import { RouteMapPanel } from "./RouteMapPanel";
import { RouteOptimizeConfirmDialog } from "./RouteOptimizeConfirmDialog";
import {
  StyledAddStopRow,
  StyledOptimizeRow,
  StyledStopActions,
  StyledStopRow,
  StyledStopSeq,
  StyledStopsPanel,
  StyledStopList,
  StyledStopName,
  StyledDraftBox,
  StyledDraftHint,
  StyledDraftActions,
} from "./RouteStopsPanel.styled";

// 백엔드 `StopProximity.MERGE_RADIUS_METERS` 와 같은 값 — 이 안이면 반영해도 기존 승하차지에 붙는다.
const STOP_MERGE_RADIUS_METERS = 50;

type RouteStopsPanelProps = {
  routeId: number;
};

// §5.9 정차 순서 관리 — GET 상세의 stops[] 를 그대로 편집한다. stop_id 를 고를 카탈로그
// 조회 엔드포인트가 사양에 없어(§2 확신 없는 지점) "정차지 ID 로 추가"만 제공한다 —
// 이름·좌표는 서버가 그 ID 로 채워 주므로 저장 후 다시 불러와야 화면에 반영된다.
export const RouteStopsPanel = ({ routeId }: RouteStopsPanelProps) => {
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState({ lat: "", lng: "" });
  const [destination, setDestination] = useState({ lat: "", lng: "" });
  const [confirmingOptimize, setConfirmingOptimize] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  // 정차지 추가·삭제·순서 저장 뒤 RouteMapPanel 이 경로를 다시 불러오게 하는 트리거 —
  // load() 가 서버 상태를 새로 받아올 때마다 올려 지도도 같이 갱신한다.
  const [pathVersion, setPathVersion] = useState(0);
  // 2026-09-22 사용자 지시 — 주소 검색 → 위치 확인 → (필요시) 수정 → 반영.
  // `draft` 는 **아직 서버에 없는** 지점이다. 반영 버튼을 누르기 전까지 노선도 승하차지도 안 바뀐다.
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState<StopSearchResultTypes | null>(null);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [draftName, setDraftName] = useState("");
  const [adding, setAdding] = useState(false);
  // 드래그로 순서 바꾸기(2026-09-22 사용자 지시) — 끌고 있는 행의 위치. 라이브러리를 더하지 않고
  // HTML5 드래그 이벤트만 쓴다. 위·아래 버튼은 그대로 둔다 — 키보드만 쓰는 사용자는 끌 수 없다.
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const detail = await getRouteDetail(routeId);
      setStops(detail.stops);
      setError(null);
      setPathVersion((version) => version + 1);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "정차 순서를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= stops.length) return;
    const next = [...stops];
    [next[index], next[target]] = [next[target], next[index]];
    setStops(next);
  };

  const remove = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateRoute(routeId, { stopIds: stops.map((stop) => stop.stopId) });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "정차 순서 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const canOptimize =
    origin.lat.trim() && origin.lng.trim() && destination.lat.trim() && destination.lng.trim();

  const handleOptimizeConfirm = async () => {
    setOptimizing(true);
    setError(null);
    try {
      const detail = await optimizeRoute(routeId, {
        origin: { lat: Number(origin.lat), lng: Number(origin.lng) },
        destination: { lat: Number(destination.lat), lng: Number(destination.lng) },
      });
      setStops(detail.stops);
      setConfirmingOptimize(false);
      setPathVersion((version) => version + 1);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "최적화에 실패했습니다");
    } finally {
      setOptimizing(false);
    }
  };

  const moveTo = (from: number, to: number) => {
    if (from === to) return;
    setStops((previous) => {
      const next = [...previous];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSearch = async () => {
    if (address.trim().length === 0) return;
    setSearching(true);
    setError(null);
    try {
      const result = await searchStopAddress(address.trim());
      setSearch(result);
      setDraft({ lat: result.lat, lng: result.lng });
      setDraftName(result.displayName);
    } catch (cause) {
      setSearch(null);
      setDraft(null);
      setError(cause instanceof ApiError ? cause.message : "주소를 찾지 못했습니다");
    } finally {
      setSearching(false);
    }
  };

  const handleAddSearched = async () => {
    if (!draft || draftName.trim().length === 0) return;
    setAdding(true);
    setError(null);
    try {
      const detail = await addRouteStop(routeId, {
        lat: draft.lat,
        lng: draft.lng,
        name: draftName.trim(),
        address: search?.displayName,
      });
      setStops(detail.stops);
      setSearch(null);
      setDraft(null);
      setAddress("");
      setPathVersion((version) => version + 1);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "정차지를 추가하지 못했습니다");
    } finally {
      setAdding(false);
    }
  };

  // 두 좌표 사이 거리(m) — 평면 근사다. 판정 범위가 수십~수백 m 라 곡률 오차가 보이지 않는다
  // (백엔드 `StopProximity.metersBetween` 과 같은 규칙·같은 상수).
  const metersBetween = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number =>
    Math.round(
      Math.hypot((a.lat - b.lat) * 111_320, (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180)),
    );

  // 검색 결과에서 얼마나 옮겼는지 — 관계자가 "너무 멀리 찍었나" 를 스스로 판단할 유일한 값이다.
  const movedMeters = search && draft ? metersBetween(draft, search) : 0;

  // ⚠ 거리를 **옮긴 지점 기준으로 다시 잰다.** 서버가 준 `distance_m` 은 검색 지점 기준이라,
  // 중복을 피하려고 핀을 옮긴 뒤에도 경고가 그대로 남아 관계자의 판단을 흐린다.
  // 임계는 백엔드 근접 병합과 같은 50m 다 — 이 안이면 반영해도 새 승하차지가 아니라 기존 것에 붙는다.
  const nearbyFromDraft =
    search && draft
      ? search.nearby
          .map((stop) => ({ ...stop, distanceM: metersBetween(draft, stop) }))
          .filter((stop) => stop.distanceM <= STOP_MERGE_RADIUS_METERS)
          .sort((left, right) => left.distanceM - right.distanceM)
      : [];

  if (loading) return <p>불러오는 중...</p>;

  return (
    <StyledStopsPanel>
      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <RouteMapPanel
        routeId={routeId}
        refreshKey={pathVersion}
        draft={draft}
        onMapClick={search ? (point) => setDraft(point) : undefined}
      />

      <Card padding={16}>
        {stops.length === 0 ? (
          <p>정차지가 없습니다.</p>
        ) : (
          <StyledStopList>
          {stops.map((stop, index) => (
            <StyledStopRow
              key={`${stop.stopId}-${index}`}
              role="listitem"
              draggable
              $dragging={draggingIndex === index}
              onDragStart={() => setDraggingIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggingIndex !== null) moveTo(draggingIndex, index);
                setDraggingIndex(null);
              }}
              onDragEnd={() => setDraggingIndex(null)}
            >
              <StyledStopSeq>{index + 1}</StyledStopSeq>
              <StyledStopName>{stop.name}</StyledStopName>
              <StyledStopActions>
                <Button variant="ghost" size="sm" icon="arrow-up" onClick={() => move(index, -1)} disabled={index === 0} />
                <Button
                  variant="ghost"
                  size="sm"
                  icon="arrow-down"
                  onClick={() => move(index, 1)}
                  disabled={index === stops.length - 1}
                />
                <Button variant="ghost" size="sm" icon="x" onClick={() => remove(index)} />
              </StyledStopActions>
            </StyledStopRow>
          ))}
          </StyledStopList>
        )}
      </Card>

      <Card padding={16}>
        <StyledAddStopRow>
          <Input
            label="도로명 주소로 검색"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="예) 서울시 중앙로 20"
          />
          <Button variant="secondary" onClick={handleSearch} disabled={searching}>
            {searching ? "검색 중..." : "검색"}
          </Button>
        </StyledAddStopRow>

        {search && draft ? (
          <StyledDraftBox>
            <p>{search.displayName}</p>
            <StyledDraftHint>
              지도를 눌러 실제로 버스가 서는 지점(블록 모퉁이·도로가)으로 옮길 수 있습니다
              {movedMeters > 0 ? ` · 검색 위치에서 약 ${movedMeters}m 옮김` : ""}
            </StyledDraftHint>
            {nearbyFromDraft.length > 0 ? (
              <AlertBanner
                tone="moving"
                title={`이 자리에 이미 "${nearbyFromDraft[0].name}" 이(가) 있습니다 (${nearbyFromDraft[0].distanceM}m)`}
              />
            ) : null}
            <Input
              label="표시명"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
            <StyledDraftActions>
              <Button variant="ghost" onClick={() => { setSearch(null); setDraft(null); }}>
                취소
              </Button>
              <Button variant="primary" onClick={handleAddSearched} disabled={adding}>
                {adding ? "추가 중..." : "이 위치로 추가"}
              </Button>
            </StyledDraftActions>
          </StyledDraftBox>
        ) : null}
      </Card>

      <Button variant="primary" onClick={handleSave} disabled={saving}>
        {saving ? "저장 중..." : "정차 순서 저장"}
      </Button>

      <StyledOptimizeRow>
        <Input
          label="출발 기준점 위도"
          value={origin.lat}
          onChange={(event) => setOrigin({ ...origin, lat: event.target.value })}
        />
        <Input
          label="출발 기준점 경도"
          value={origin.lng}
          onChange={(event) => setOrigin({ ...origin, lng: event.target.value })}
        />
        <Input
          label="도착 기준점 위도"
          value={destination.lat}
          onChange={(event) => setDestination({ ...destination, lat: event.target.value })}
        />
        <Input
          label="도착 기준점 경도"
          value={destination.lng}
          onChange={(event) => setDestination({ ...destination, lng: event.target.value })}
        />
        <Button variant="secondary" disabled={!canOptimize} onClick={() => setConfirmingOptimize(true)}>
          최적화 실행
        </Button>
      </StyledOptimizeRow>

      {confirmingOptimize ? (
        <RouteOptimizeConfirmDialog
          onCancel={() => setConfirmingOptimize(false)}
          onConfirm={handleOptimizeConfirm}
          submitting={optimizing}
        />
      ) : null}
    </StyledStopsPanel>
  );
};
