"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { setLeaveWarning } from "@/shared/lib/navigation/leaveGuard";
import { AlertBanner, Badge, Button, EmptyState, IconButton } from "@/shared/ui";
import { getRouteDetail, optimizeRoute, saveRouteStops } from "../api";
import type { NearbyStopTypes, RouteStop, RunDirection, StopSuggestionTypes } from "../types";
import { RouteMapPanel } from "./RouteMapPanel";
import { RouteOptimizeConfirmDialog } from "./RouteOptimizeConfirmDialog";
import { StopForm } from "./StopForm";
import {
  StyledEditor,
  StyledListColumn,
  StyledListHeader,
  StyledListHeaderActions,
  StyledListTitle,
  StyledSaveBar,
  StyledSaveStatus,
  StyledStopList,
  StyledStopName,
  StyledStopRow,
  StyledStopSeq,
  StyledStopActions,
  StyledStopMain,
  StyledMapColumn,
} from "./RouteStopsPanel.styled";

type Point = { lat: number; lng: number };

/** 목록의 한 줄 — `stopId` 가 없으면 저장할 때 새로 만든다. `key` 는 화면 안에서만 쓰는 이름표다. */
type EditableStop = Point & { key: string; stopId?: string; name: string; address?: string };

type StopFormState = {
  mode: "add" | "edit";
  /** 수정 중인 줄 — 추가면 없다. */
  key?: string;
  name: string;
  address?: string;
  pin: Point | null;
  /** 옮긴 거리를 잴 기준(고른 후보 · 원래 자리). */
  anchor: Point | null;
  /** 카메라를 옮길 자리 — 핀을 끌어도 바뀌지 않는다. */
  focus: Point | null;
  nearby: NearbyStopTypes[];
};

type RouteStopsPanelProps = {
  routeId: string;
  direction: RunDirection;
};

const fromServer = (stops: RouteStop[]): EditableStop[] =>
  stops.map((stop) => ({ key: `stop-${stop.stopId}`, stopId: stop.stopId, name: stop.name, lat: stop.lat, lng: stop.lng }));

// 무엇이 바뀌었는지 — 줄마다 표시하고 저장 버튼 옆에 몇 건인지 알린다.
const isEdited = (stop: EditableStop, saved: EditableStop[]): boolean => {
  const original = saved.find((candidate) => candidate.stopId === stop.stopId);
  return !!original && (original.name !== stop.name || original.lat !== stop.lat || original.lng !== stop.lng);
};

const countChanges = (stops: EditableStop[], saved: EditableStop[]): number => {
  const added = stops.filter((stop) => stop.stopId === undefined).length;
  const kept = stops.filter((stop) => stop.stopId !== undefined);
  const removed = saved.filter((stop) => !kept.some((candidate) => candidate.stopId === stop.stopId)).length;
  const edited = kept.filter((stop) => isEdited(stop, saved)).length;
  const keptOrder = kept.map((stop) => stop.stopId);
  const savedOrder = saved.map((stop) => stop.stopId).filter((stopId) => keptOrder.includes(stopId));
  const reordered = keptOrder.some((stopId, index) => stopId !== savedOrder[index]) ? 1 : 0;
  return added + removed + edited + reordered;
};

/**
 * 고정 노선의 승하차지 편성(2026-09-23 사용자 지시) — 목록은 왼쪽 좁은 칸, 지도는 오른쪽(지시 1).
 *
 * <p><b>저장 버튼을 누르기 전까지 서버는 아무것도 모른다</b>(지시 7). 추가·수정·삭제·순서는 이 화면의 목록만
 * 바꾸고, 저장이 `PUT /staff/routes/{id}/stops` 한 요청으로 보낸다 — 하나라도 거부되면 서버는 아무것도 안
 * 바꾸므로(백엔드 검증) 반쯤 저장된 노선이 남지 않는다.
 */
export const RouteStopsPanel = ({ routeId, direction }: RouteStopsPanelProps) => {
  const [saved, setSaved] = useState<EditableStop[]>([]);
  const [stops, setStops] = useState<EditableStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<StopFormState | null>(null);
  const [confirmingOptimize, setConfirmingOptimize] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  // 저장·최적화 뒤 지도가 경로를 다시 불러오게 하는 트리거.
  const [pathVersion, setPathVersion] = useState(0);
  // 드래그로 순서 바꾸기 — 라이브러리 없이 HTML5 드래그만 쓴다. 위·아래 버튼은 키보드 사용자를 위해 둔다.
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [nextKey, setNextKey] = useState(0);
  // 최적화에서 자리를 지킬 줄(2026-09-23 사용자 지시 — 특정 순서·시점·종점 고정). 저장 대상이 아니라 최적화
  // 조건이라 변경 건수에 넣지 않는다. 줄 이름표(`stop-{id}`)로 들고 있어 순서를 바꿔도 따라간다.
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(new Set());

  const changes = countChanges(stops, saved);
  const dirty = changes > 0;

  const adopt = (serverStops: RouteStop[]) => {
    const next = fromServer(serverStops);
    setSaved(next);
    setStops(next);
    setForm(null);
    setPathVersion((version) => version + 1);
  };

  useEffect(() => {
    (async () => {
      try {
        adopt((await getRouteDetail(routeId)).stops);
        setError(null);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "승하차지를 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    })();
  }, [routeId]);

  // 앱 안에서 떠날 때(뒤로·사이드바·로그아웃)도 묻는다 — 아래 beforeunload 는 창을 닫을 때만 불린다.
  useEffect(() => {
    setLeaveWarning(dirty ? `저장하지 않은 변경 ${changes}건이 사라집니다. 이 화면을 떠날까요?` : null);
    return () => setLeaveWarning(null);
  }, [dirty, changes]);

  // 저장하지 않은 채 창을 닫으면 편집이 사라진다 — 브라우저가 한 번 묻게 한다.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const moveTo = (from: number, to: number) => {
    if (from === to || to < 0 || to >= stops.length) return;
    const next = [...stops];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setStops(next);
  };

  // 이전 값에서 계산한다 — 한 틱에 두 번 누르면(빠른 연타) 둘 다 같은 옛 값을 읽어 하나가 사라진다.
  const togglePin = (key: string) =>
    setPinnedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // 정차지 쪽 끝 — 등원은 첫 승차지가 시점(종점은 학원), 하원은 마지막 하차지가 종점(시점은 학원).
  const endpointLabelOf = (index: number): string | null => {
    if (direction === "to_academy" && index === 0) return "시점";
    if (direction === "from_academy" && index === stops.length - 1) return "종점";
    return null;
  };

  const pinnedStopIds = stops
    .filter((stop) => pinnedKeys.has(stop.key) && stop.stopId !== undefined)
    .map((stop) => stop.stopId as string);

  const remove = (key: string) => {
    setStops(stops.filter((stop) => stop.key !== key));
    if (form?.key === key) setForm(null);
  };

  const startAdd = () =>
    setForm({ mode: "add", name: "", pin: null, anchor: null, focus: null, nearby: [] });

  const startEdit = (stop: EditableStop) =>
    setForm({ mode: "edit", key: stop.key, name: stop.name, address: stop.address, pin: stop, anchor: stop, focus: stop,
      nearby: [] });

  const pickSuggestion = (suggestion: StopSuggestionTypes) => {
    if (!form) return;
    const point = { lat: suggestion.lat, lng: suggestion.lng };
    setForm({
      ...form,
      // 추가는 후보 주소를 표시명 기본값으로 쓴다. 수정은 관계자가 붙인 이름을 지우지 않는다.
      name:
        form.mode === "add" || form.name.trim().length === 0
          ? (suggestion.placeName ?? suggestion.displayName)
          : form.name,
      address: suggestion.displayName,
      pin: point,
      anchor: point,
      focus: point,
      nearby: suggestion.nearby,
    });
  };

  const applyForm = () => {
    if (!form?.pin) return;
    const values = { name: form.name.trim(), address: form.address, lat: form.pin.lat, lng: form.pin.lng };
    if (form.mode === "add") {
      setStops([...stops, { key: `new-${nextKey}`, ...values }]);
      setNextKey(nextKey + 1);
    } else {
      setStops(stops.map((stop) => (stop.key === form.key ? { ...stop, ...values } : stop)));
    }
    setForm(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const detail = await saveRouteStops(
        routeId,
        stops.map((stop) => ({ stopId: stop.stopId, name: stop.name, address: stop.address, lat: stop.lat, lng: stop.lng })),
      );
      adopt(detail.stops);
    } catch (cause) {
      // 편집한 목록은 그대로 둔다 — 고쳐서 다시 저장할 수 있어야 한다(서버는 아무것도 안 바꿨다).
      setError(cause instanceof ApiError ? cause.message : "저장하지 못했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleOptimizeConfirm = async () => {
    setOptimizing(true);
    setError(null);
    try {
      adopt((await optimizeRoute(routeId, pinnedStopIds)).stops);
      setConfirmingOptimize(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "최적화에 실패했습니다");
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) return <p>불러오는 중...</p>;

  return (
    <StyledEditor>
      <StyledListColumn>
        <StyledListHeader>
          <StyledListTitle>
            승하차지 <strong>{stops.length}</strong>곳
          </StyledListTitle>
          <StyledListHeaderActions>
            <Button
              variant="ghost"
              size="sm"
              icon="sparkles"
              onClick={() => setConfirmingOptimize(true)}
              disabled={dirty || stops.length < 2 || form !== null}
              title={dirty ? "저장한 뒤에 최적화할 수 있습니다" : undefined}
            >
              순서 최적화
            </Button>
            <Button variant="soft" size="sm" icon="plus" onClick={startAdd} disabled={form !== null}>
              승하차지 추가
            </Button>
          </StyledListHeaderActions>
        </StyledListHeader>

        {error ? <AlertBanner tone="missed" title={error} /> : null}

        {form ? (
          <StopForm
            mode={form.mode}
            name={form.name}
            onNameChange={(name) => setForm({ ...form, name })}
            pin={form.pin}
            anchor={form.anchor}
            nearby={form.nearby}
            onPick={pickSuggestion}
            onCancel={() => setForm(null)}
            onApply={applyForm}
          />
        ) : null}

        {stops.length === 0 ? (
          <EmptyState icon="map-pin" title="승하차지가 없습니다">
            &quot;승하차지 추가&quot; 로 주소를 검색해 넣으세요
          </EmptyState>
        ) : (
          <StyledStopList role="list" aria-label="승하차지 목록">
            {stops.map((stop, index) => (
              <StyledStopRow
                key={stop.key}
                role="listitem"
                draggable={form === null}
                $dragging={draggingIndex === index}
                $selected={form?.key === stop.key}
                onDragStart={() => setDraggingIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingIndex !== null) moveTo(draggingIndex, index);
                  setDraggingIndex(null);
                }}
                onDragEnd={() => setDraggingIndex(null)}
              >
                <StyledStopSeq>{index + 1}</StyledStopSeq>
                <StyledStopMain>
                  <StyledStopName>{stop.name}</StyledStopName>
                  {endpointLabelOf(index) ? <Badge tone="neutral">{endpointLabelOf(index)}</Badge> : null}
                  {stop.stopId === undefined ? <Badge tone="added">새로 추가</Badge> : null}
                  {isEdited(stop, saved) ? <Badge tone="amber">수정됨</Badge> : null}
                </StyledStopMain>
                <StyledStopActions>
                  <IconButton
                    icon={pinnedKeys.has(stop.key) ? "lock" : "lock-open"}
                    label={`${stop.name} 자리 고정`}
                    title={pinnedKeys.has(stop.key) ? "최적화해도 이 자리를 지킵니다 — 누르면 해제" : "최적화해도 이 자리를 지키게 고정"}
                    size={28}
                    aria-pressed={pinnedKeys.has(stop.key)}
                    tone={pinnedKeys.has(stop.key) ? "soft" : "plain"}
                    onClick={() => togglePin(stop.key)}
                  />
                  <IconButton icon="arrow-up" label={`${stop.name} 위로`} size={28} onClick={() => moveTo(index, index - 1)}
                    disabled={index === 0} />
                  <IconButton icon="arrow-down" label={`${stop.name} 아래로`} size={28} onClick={() => moveTo(index, index + 1)}
                    disabled={index === stops.length - 1} />
                  <IconButton icon="pencil" label={`${stop.name} 수정`} size={28} onClick={() => startEdit(stop)}
                    disabled={form !== null} />
                  <IconButton icon="trash-2" label={`${stop.name} 삭제`} size={28} onClick={() => remove(stop.key)} />
                </StyledStopActions>
              </StyledStopRow>
            ))}
          </StyledStopList>
        )}

        <StyledSaveBar $dirty={dirty}>
          <StyledSaveStatus>{dirty ? `저장하지 않은 변경 ${changes}건` : "저장된 상태입니다"}</StyledSaveStatus>
          <Button variant="ghost" size="sm" onClick={() => { setStops(saved); setForm(null); }} disabled={!dirty || saving}>
            되돌리기
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!dirty || saving || form !== null}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </StyledSaveBar>
      </StyledListColumn>

      <StyledMapColumn>
        <RouteMapPanel
          routeId={routeId}
          direction={direction}
          refreshKey={pathVersion}
          stops={stops}
          editingKey={form?.mode === "edit" ? (form.key ?? null) : null}
          pin={form?.pin ?? null}
          focus={form?.focus ?? null}
          dirty={dirty}
          onPinMove={(point) => form && setForm({ ...form, pin: point })}
        />
      </StyledMapColumn>

      {confirmingOptimize ? (
        <RouteOptimizeConfirmDialog
          fixedCount={pinnedStopIds.length}
          onCancel={() => setConfirmingOptimize(false)}
          onConfirm={handleOptimizeConfirm}
          submitting={optimizing}
        />
      ) : null}
    </StyledEditor>
  );
};
