"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { getBuses } from "../api";
import type { BusItemResponseTypes } from "../types";

// 차량 선택칸 한 쪽의 크기. 이보다 많으면 `hasMore` 로 알린다(검색형으로 바꾸기 전까지의 상한).
export const BUS_OPTION_LIMIT = 100;

type CurrentBus = { id: string; busNo: string };

// 스케줄·회차·노선 편성 폼의 차량 선택지 — 조회 실패와 상한 초과를 조용히 삼키지 않고 폼이 알리게 한다.
// `current` 는 수정 폼의 현재 차량으로, 목록 밖(101번째 이후)이어도 선택칸에 표시가 남게 한다.
export const useBusOptions = (current?: CurrentBus) => {
  const [buses, setBuses] = useState<BusItemResponseTypes[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getBuses(0, BUS_OPTION_LIMIT);
        if (cancelled) return;
        setBuses(data.items);
        setHasMore(data.hasNext);
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof ApiError ? `차량 목록을 불러오지 못했습니다 — ${cause.message}` : "차량 목록을 불러오지 못했습니다",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const options = buses.map((bus) => ({ value: String(bus.id), label: `${bus.busNo} (${bus.plateNo})` }));
  if (current && !buses.some((bus) => String(bus.id) === current.id)) {
    options.unshift({ value: current.id, label: current.busNo });
  }

  return { buses, options, hasMore, error, reload: () => setReloadKey((key) => key + 1) };
};
