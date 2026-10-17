"use client";

import { useCallback, useEffect, useRef } from "react";
import type { WebSocketEnvelope, WsConnectionState } from "../lib/ws";
import { usePolling } from "./usePolling";
import { useRealtimeChannel } from "./useRealtimeChannel";

// 실시간 연결이 끊겼을 때(재연결 중)의 안전망 간격 — §5.18 이 5~10초 폴링 대상이라고 명시(LOC-01)해 중간값 7초를 쓴다.
export const LIVE_POLL_INTERVAL_MS = 7000;
// 연결이 살아 있으면 방송이 갱신을 가져온다 — 방송이 없는 값과 놓친 방송은 이 느린 조회가 메운다(Ruling 873).
// 연결이 끊기면 서버 무송신 20초 초과를 10초 주기로 점검해 20~30초 안에 감지하고 7초로 돌아간다(`API_SPEC §7.2`).
export const LIVE_POLL_CONNECTED_INTERVAL_MS = 30000;
// 방송 뒤 재조회를 묶는 간격.
const EVENT_REFRESH_DEBOUNCE_MS = 300;

export type UseLiveRefreshOptions = {
  destination: string;
  /**
   * `stop_arrived`·`rider_changed`·`run_started`·`run_ended` 가 이 화면에 갖는 뜻 — 다시 읽을 범위가 넓으면 `true`,
   * 좁으면 `false`, 이 화면과 무관한 방송이면 `null`(무시). 묶음 안에 `true` 가 하나라도 있으면 `refresh(true)` 로 넘어간다.
   */
  refreshScope: (envelope: WebSocketEnvelope) => boolean | null;
  /** 묶음이 끝났을 때 한 번 부른다 — 무엇을 다시 읽을지는 화면이 정한다. */
  refresh: (wide: boolean) => void;
  /** 위의 4종이 아닌 방송(위치 · 승인 요청 · 비상 등) */
  onEnvelope?: (envelope: WebSocketEnvelope) => void;
  /** 끊겼다 다시 붙었을 때 — 끊긴 사이의 방송은 되찾을 길이 없어 화면이 REST 로 한 번 메운다(`API_SPEC §7.2`). 없으면 보충하지 않는다. */
  onReconnected?: () => void;
  /** 안전망 조회. 실패는 `false` 로 알린다(간격이 늘어난다). 간격은 연결 상태를 따른다 — 연결 30초 · 끊김 7초. */
  poll: () => Promise<boolean>;
  pollEnabled?: boolean;
};

// 대시보드·관제·운행 상세가 같이 쓰는 "방송 → 묶어서 재조회 + 연결 상태에 따른 안전망 폴링" 묶음.
// 잇단 방송은 짧게 묶어 한 번만 읽는다 — 첫 방송이 타이머를 걸고, 타이머가 도는 동안의 방송은 그 묶음에 들어간다
// (타이머를 밀지 않으므로 방송이 쉬지 않고 와도 화면이 300ms 보다 오래 낡지 않는다).
// 위치 반영 · 승인 요청 · 비상 알림처럼 화면마다 다른 방송은 `onEnvelope` 로 넘어온다.
export const useLiveRefresh = ({
  destination,
  refreshScope,
  refresh,
  onEnvelope,
  onReconnected,
  poll,
  pollEnabled = true,
}: UseLiveRefreshOptions): { connectionState: WsConnectionState; cancelPendingRefresh: () => void } => {
  const refreshScopeRef = useRef(refreshScope);
  const refreshRef = useRef(refresh);
  const onEnvelopeRef = useRef(onEnvelope);
  useEffect(() => {
    refreshScopeRef.current = refreshScope;
    refreshRef.current = refresh;
    onEnvelopeRef.current = onEnvelope;
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wideRef = useRef(false);
  const cancelPendingRefresh = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    wideRef.current = false;
  }, []);
  const scheduleRefresh = useCallback((wide: boolean) => {
    if (wide) wideRef.current = true;
    if (timerRef.current !== null) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const wideNow = wideRef.current;
      wideRef.current = false;
      refreshRef.current(wideNow);
    }, EVENT_REFRESH_DEBOUNCE_MS);
  }, []);
  // 화면을 떠나면 예약해 둔 방송 재조회도 버린다.
  useEffect(() => cancelPendingRefresh, [cancelPendingRefresh]);

  const handleEnvelope = useCallback(
    (envelope: WebSocketEnvelope) => {
      switch (envelope.event) {
        case "stop_arrived":
        case "rider_changed":
        case "run_started":
        case "run_ended": {
          const wide = refreshScopeRef.current(envelope);
          if (wide !== null) scheduleRefresh(wide);
          return;
        }
        default:
          onEnvelopeRef.current?.(envelope);
      }
    },
    [scheduleRefresh],
  );

  const { connectionState } = useRealtimeChannel(destination, handleEnvelope, onReconnected);
  usePolling(poll, connectionState === "connected" ? LIVE_POLL_CONNECTED_INTERVAL_MS : LIVE_POLL_INTERVAL_MS, pollEnabled);

  return { connectionState, cancelPendingRefresh };
};
