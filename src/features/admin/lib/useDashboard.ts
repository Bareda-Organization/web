"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePolling } from "@/shared/hooks";
import { ApiError } from "@/shared/lib/http";
import { getDashboard } from "../api/dashboard";
import type { DashboardDays, DashboardResponseTypes } from "../types/dashboard";
import { dashboardQuery } from "./dashboardView";

/** 대시보드는 30초마다 한 번 읽는다(§6.18). */
export const DASHBOARD_POLL_MS = 30_000;

const FALLBACK_ERROR = "대시보드를 불러오지 못했습니다";

/** 학원 칩 후보 — 학원을 하나로 좁힌 응답에는 그 학원만 들어 있어서, 전체 학원 응답에서 받은 목록을 기억해 둔다. */
export type DashboardAcademyOption = { academyId: string; academyName: string };

// 기간·학원 조건으로 대시보드를 읽고 30초마다 갱신한다.
// - 조건을 바꾸면 이전 조건의 값은 버린다(다른 조건의 숫자를 새 조건 것처럼 보이지 않게) — 새 값이 오기 전에는 `data` 가 null 이다.
// - 갱신이 실패하면 같은 조건에서 마지막으로 받은 값을 지우지 않고 `error` 만 채운다(Ruling 433) — 화면은 오류 띠 + 다시 시도를 얹는다.
export const useDashboard = (days: DashboardDays, academy: string) => {
  const key = `${days}|${academy}`;
  const [snapshot, setSnapshot] = useState<{ key: string; data: DashboardResponseTypes } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [academyOptions, setAcademyOptions] = useState<DashboardAcademyOption[]>([]);
  const requestRef = useRef(0);

  const load = useCallback(
    async (showLoading: boolean): Promise<boolean> => {
      const requestId = ++requestRef.current;
      const query = dashboardQuery(days, academy);
      if (showLoading) setLoading(true);
      try {
        const next = await getDashboard(query.days, query.academyId);
        if (requestId !== requestRef.current) return true;
        setSnapshot({ key, data: next });
        if (academy === "all") setAcademyOptions(next.academies.map(({ academyId, academyName }) => ({ academyId, academyName })));
        setError(null);
        return true;
      } catch (cause) {
        if (requestId !== requestRef.current) return true;
        setError({ key, message: cause instanceof ApiError ? cause.message : FALLBACK_ERROR });
        return false;
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [days, academy, key],
  );

  useEffect(() => {
    (async () => {
      await load(true);
    })();
  }, [load]);
  usePolling(() => load(false), DASHBOARD_POLL_MS);

  return {
    data: snapshot?.key === key ? snapshot.data : null,
    error: error?.key === key ? error.message : null,
    loading,
    academyOptions,
    retry: () => load(true),
  };
};
