"use client";

import { useState } from "react";
import { apiFetch } from "@/shared/lib/http";
import { Button } from "@/shared/ui";
import { useAuthSession } from "../hooks/useAuthSession";

const CONFIRM_MESSAGE =
  "테스트 데이터를 처음 상태로 되돌립니다.\n다른 팀원이 바꾼 내용도 모두 사라지고, 모두 다시 로그인해야 합니다.\n계속할까요?";

/**
 * 테스트 데이터 초기화(Ruling 364) — 팀원 체험용 서버(`docker-compose.staging.yml`)에서만 빌드 설정으로 켠다.
 * 서버의 `POST /dev/reset`(API_SPEC §11.1)을 부른다. 초기화가 로그인 유지 토큰까지 지우므로 끝나면 로그아웃해
 * 로그인 화면으로 보낸다 — 두면 한참 뒤 아무 화면에서나 갑자기 튕긴다.
 */
export const TestDataResetButton = () => {
  const { logout } = useAuthSession();
  const [running, setRunning] = useState(false);

  if (process.env.NEXT_PUBLIC_TEST_DATA_RESET !== "true") return null;

  const handleClick = async () => {
    if (!window.confirm(CONFIRM_MESSAGE)) return;
    setRunning(true);
    try {
      await apiFetch("/dev/reset", { method: "POST" });
    } catch (cause) {
      console.warn("테스트 데이터 초기화 실패", cause);
      window.alert("초기화에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
      setRunning(false);
      return;
    }
    await logout().catch((cause: unknown) => console.warn("초기화 후 로그아웃 요청 실패", cause));
  };

  return (
    <Button variant="ghost" size="sm" icon="rotate-ccw" onClick={handleClick} disabled={running}>
      {running ? "초기화 중..." : "테스트 데이터 초기화"}
    </Button>
  );
};
