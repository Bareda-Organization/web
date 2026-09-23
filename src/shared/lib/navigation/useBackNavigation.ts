"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// 상세 화면의 한 단계 위 — `/route/1000` → `/route`. 최상위 화면이면 없다.
const parentOf = (pathname: string): string | null => {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length > 1 ? `/${segments.slice(0, -1).join("/")}` : null;
};

/**
 * 뒤로가기(2026-09-23 사용자 지시) — **이 앱 안에서 지나온 화면**으로 돌아간다.
 *
 * <p>브라우저 이력만 믿으면 첫 화면에서 누를 때 로그인 화면(또는 다른 사이트)으로 나간다. 그래서 이 셸 안에서
 * 지나온 경로를 직접 적어 두고, 적힌 앞 화면이 있을 때만 브라우저 이력으로 돌아간다. 없으면 상세 → 목록처럼
 * 한 단계 위로 가고, 그것도 없으면(처음 들어온 최상위 화면) 돌아갈 곳이 없다.
 *
 * <p>브라우저의 뒤로 버튼으로 돌아온 경우도 맞춘다 — 새 경로가 바로 앞 경로와 같으면 앞으로 간 것이 아니라
 * 돌아온 것으로 보고 목록에서 뺀다. 빼지 않으면 목록이 A→B→A 로 자라, 다음 뒤로가기가 앱 밖으로 나간다.
 */
export const useBackNavigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [trail, setTrail] = useState<string[]>([pathname]);

  // 경로가 바뀐 그 렌더에서 바로 맞춘다(React 의 "prop 이 바뀌면 state 를 고친다" 방식) — 효과 안에서 고치면
  // 한 번은 옛 목록으로 그려져 뒤로 버튼이 깜빡인다.
  if (trail[trail.length - 1] !== pathname) {
    setTrail(trail[trail.length - 2] === pathname ? trail.slice(0, -1) : [...trail, pathname]);
  }

  const hasPrevious = trail.length > 1;
  const parent = parentOf(pathname);

  const goBack = () => {
    if (hasPrevious) router.back();
    else if (parent) router.push(parent);
  };

  return { canGoBack: hasPrevious || parent !== null, goBack };
};
