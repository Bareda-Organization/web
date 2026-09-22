"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, Input } from "@/shared/ui";
import { getRouteDetail, optimizeRoute, updateRoute } from "../api";
import type { RouteStop } from "../types";
import { RouteMapPanel } from "./RouteMapPanel";
import { RouteOptimizeConfirmDialog } from "./RouteOptimizeConfirmDialog";
import {
  StyledAddStopRow,
  StyledOptimizeRow,
  StyledStopActions,
  StyledStopRow,
  StyledStopSeq,
  StyledStopsPanel,
} from "./RouteStopsPanel.styled";

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
  const [newStopId, setNewStopId] = useState("");
  const [origin, setOrigin] = useState({ lat: "", lng: "" });
  const [destination, setDestination] = useState({ lat: "", lng: "" });
  const [confirmingOptimize, setConfirmingOptimize] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  // 정차지 추가·삭제·순서 저장 뒤 RouteMapPanel 이 경로를 다시 불러오게 하는 트리거 —
  // load() 가 서버 상태를 새로 받아올 때마다 올려 지도도 같이 갱신한다.
  const [pathVersion, setPathVersion] = useState(0);

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

  const addStop = () => {
    const stopId = Number(newStopId);
    if (!Number.isInteger(stopId) || stopId <= 0) return;
    setStops([...stops, { stopId, seq: stops.length + 1, name: `승하차지 #${stopId}`, lat: 0, lng: 0 }]);
    setNewStopId("");
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

  if (loading) return <p>불러오는 중...</p>;

  return (
    <StyledStopsPanel>
      {error ? <AlertBanner tone="missed" title={error} /> : null}

      <RouteMapPanel routeId={routeId} refreshKey={pathVersion} />

      <Card padding={16}>
        {stops.length === 0 ? (
          <p>정차지가 없습니다.</p>
        ) : (
          stops.map((stop, index) => (
            <StyledStopRow key={`${stop.stopId}-${index}`}>
              <StyledStopSeq>{index + 1}</StyledStopSeq>
              <span>{stop.name}</span>
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
          ))
        )}
      </Card>

      <StyledAddStopRow>
        <Input
          label="정차지 ID 로 추가"
          value={newStopId}
          onChange={(event) => setNewStopId(event.target.value)}
          placeholder="stop_id"
        />
        <Button variant="secondary" onClick={addStop}>
          추가
        </Button>
      </StyledAddStopRow>

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
