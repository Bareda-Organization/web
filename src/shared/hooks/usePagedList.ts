"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/http";

export type PagedPage<T> = { items: T[]; totalCount: number; hasNext: boolean };

const EMPTY_PAGE = { items: [], totalCount: 0, hasNext: false };

type Options = {
  /** 이 값이 바뀌면(필터·탭 변경) 0쪽부터 다시 읽는다 */
  resetKey?: string;
  /** 주기 갱신(ms) — 갱신 실패는 이미 보이던 목록을 지우지 않는다 */
  pollMs?: number;
  /** 서버 오류 문구가 없을 때 쓸 문구 */
  errorMessage: string;
};

// 목록 화면이 함께 쓰는 "쪽 단위 조회" — §1.8 페이징(0 기점) · 늦은 응답 무시 · 실패해도 직전 목록 유지.
//
// - 필터를 바꿔 0쪽으로 돌아갈 때도 요청은 한 번만 나간다(쪽 번호를 effect 로 되돌리지 않고 `resetKey` 로 파생한다).
// - 요청이 겹치면 마지막에 보낸 요청의 응답만 화면에 반영한다.
// - 실패하면 `error` 만 채운다 — 폴링 한 번의 실패가 "목록이 비었다" 로 그려지지 않는다.
// 응답에 쪽 정보 말고 다른 필드(예: unackedCount)가 있으면 `data` 로 그대로 돌려준다.
export const usePagedList = <R extends PagedPage<unknown>>(fetchPage: (page: number) => Promise<R>, options: Options) => {
  const { resetKey = "", pollMs, errorMessage } = options;
  const [pageState, setPageState] = useState({ page: 0, key: resetKey });
  const page = pageState.key === resetKey ? pageState.page : 0;
  const [data, setData] = useState<R | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRef = useRef(fetchPage);
  const requestRef = useRef(0);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  const load = useCallback(
    async (targetPage: number, showLoading: boolean) => {
      const requestId = ++requestRef.current;
      if (showLoading) setLoading(true);
      try {
        const next = await fetchRef.current(targetPage);
        if (requestId !== requestRef.current) return;
        setData(next);
        setError(null);
      } catch (cause) {
        if (requestId !== requestRef.current) return;
        setError(cause instanceof ApiError ? cause.message : errorMessage);
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [errorMessage],
  );

  useEffect(() => {
    (async () => {
      await load(page, true);
    })();
    if (!pollMs) return;
    const timer = setInterval(() => void load(page, false), pollMs);
    return () => clearInterval(timer);
  }, [load, page, resetKey, pollMs]);

  const setPage = useCallback((next: number) => setPageState({ page: next, key: resetKey }), [resetKey]);
  const reload = useCallback(() => load(page, true), [load, page]);

  const { items, totalCount, hasNext } = data ?? (EMPTY_PAGE as unknown as R);
  return { items: items as R["items"], totalCount, hasNext, data, page, setPage, loading, error, reload };
};
