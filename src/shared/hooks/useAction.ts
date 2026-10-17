"use client";

import { useCallback, useState } from "react";
import { describeApiError } from "@/shared/lib/http";

// 버튼 한 번에 API 한 번을 부르는 대화상자·폼의 공통 흐름 — 진행 중 표시, 이전 오류 지우기, 실패 문구 결정.
// run 은 성공하면 true. 실패 문구는 mapError 가 돌려준 값이 우선이고, 없으면 ApiError 메시지 또는 fallback.
export const useAction = () => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<void>, fallback: string, mapError?: (cause: unknown) => string | undefined): Promise<boolean> => {
      setPending(true);
      setError(null);
      try {
        await action();
        return true;
      } catch (cause) {
        setError(mapError?.(cause) ?? describeApiError(cause, fallback));
        return false;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return { pending, error, setError, run };
};
