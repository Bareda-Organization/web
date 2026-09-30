"use client";

import { useEffect, useRef } from "react";

// 실패가 이어질 때 간격이 늘어나는 상한(배수) — 서버가 느려졌을 때 요청을 더 얹지 않되, 복구를 너무 늦게 알아채지도 않게 한다.
const MAX_BACKOFF_FACTOR = 8;

// 다음 요청까지의 간격. 연속 실패 n 회면 간격×2ⁿ, 상한은 간격×8.
export const nextPollDelay = (intervalMs: number, failures: number): number =>
  Math.min(intervalMs * 2 ** failures, intervalMs * MAX_BACKOFF_FACTOR);

// 응답을 받은 뒤 다음 요청을 예약하는 반복 조회. `setInterval` 과 달리
// - 응답이 오기 전에는 다음 요청을 내지 않는다(서버가 느려져도 요청이 겹쳐 쌓이지 않는다)
// - 탭이 숨으면 멈추고, 다시 보이면 즉시 1회 요청한 뒤 이어간다
// - `task` 가 던지거나 `false` 를 돌려주면 실패로 보고 간격을 늘리며, 성공하면 원래 간격으로 돌아온다
// 첫 요청은 `intervalMs` 뒤다 — 마운트 직후의 첫 조회는 호출한 화면이 따로 한다.
export const usePolling = (task: () => Promise<boolean | void>, intervalMs: number, enabled = true): void => {
  const taskRef = useRef(task);
  useEffect(() => {
    taskRef.current = task;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let inFlight = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      timer = setTimeout(run, nextPollDelay(intervalMs, failures));
    };

    const run = async () => {
      timer = undefined;
      inFlight = true;
      let succeeded = true;
      try {
        succeeded = (await taskRef.current()) !== false;
      } catch {
        succeeded = false;
      }
      inFlight = false;
      if (cancelled) return;
      failures = succeeded ? 0 : failures + 1;
      // 숨은 탭이면 예약하지 않는다 — 다시 보일 때 즉시 1회 요청하며 이어진다.
      if (!document.hidden) schedule();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timer);
        timer = undefined;
      } else if (!inFlight && timer === undefined) {
        void run();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
};
