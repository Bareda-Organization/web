"use client";

import { useEffect } from "react";

// 루트 레이아웃 자체가 던졌을 때의 마지막 경계 — 레이아웃을 대체하므로 자체 html 문서이고, 스타일 토큰이 실리지 않아 기본 서식으로 그린다.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("루트 렌더링 실패", error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <h2>화면을 불러오지 못했습니다</h2>
        <p>일시적인 문제일 수 있습니다. 다시 시도해도 같으면 잠시 뒤에 다시 열어 주세요.</p>
        <button type="button" onClick={() => retry()}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
