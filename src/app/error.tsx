"use client";

import { useEffect } from "react";
import { Button, EmptyState } from "@/shared/ui";

// 라우트 안 화면이 렌더링 중 던졌을 때 콘솔 전체가 백지가 되지 않게 받는 경계 — 같은 오류가 이어지는지 사용자가 다시 시도로 확인한다.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("화면 렌더링 실패", error);
  }, [error]);

  return (
    <EmptyState
      tone="bad"
      icon="triangle-alert"
      title="화면을 불러오지 못했습니다"
      action={<Button onClick={() => retry()}>다시 시도</Button>}
    >
      일시적인 문제일 수 있습니다. 다시 시도해도 같으면 잠시 뒤에 다시 열어 주세요.
    </EmptyState>
  );
}
