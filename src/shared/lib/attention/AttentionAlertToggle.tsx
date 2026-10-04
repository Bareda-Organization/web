"use client";

import { useState } from "react";
import { Button } from "@/shared/ui";
import { isAttentionAlertEnabled, requestBrowserNotificationPermission, setAttentionAlertEnabled } from "./attentionAlert";

// 머리줄의 "브라우저 알림" 스위치 — 켜면 비상·승인 요청이 늘 때 브라우저 알림을 낸다. 기본은 꺼짐.
// 브라우저 알림 권한은 사용자가 켜는 이 조작 안에서만 요청한다.
// 꺼진 상태 글자 뒤에 '켜기' 를 붙여 상태 글자가 아니라 누를 수 있는 버튼임을 보이고(U-10), title 로 왜 켜는지 알린다.
const TITLE_OFF = "켜 두면 다른 탭을 보고 있을 때도 새 알림을 알려 줍니다";
const TITLE_ON = "다른 탭을 보고 있을 때도 새 알림을 알려 줍니다 · 누르면 끕니다";
export const AttentionAlertToggle = () => {
  const [isEnabled, setIsEnabled] = useState(() => isAttentionAlertEnabled());

  const handleToggle = async () => {
    const next = !isEnabled;
    setAttentionAlertEnabled(next);
    setIsEnabled(next);
    if (next) await requestBrowserNotificationPermission();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      icon={isEnabled ? "bell-ring" : "bell-off"}
      aria-pressed={isEnabled}
      title={isEnabled ? TITLE_ON : TITLE_OFF}
      onClick={handleToggle}
    >
      {isEnabled ? "브라우저 알림 켜짐" : "브라우저 알림 꺼짐 · 켜기"}
    </Button>
  );
};
