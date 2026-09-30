"use client";

import { useState } from "react";
import { Button } from "@/shared/ui";
import { isAttentionAlertEnabled, requestBrowserNotificationPermission, setAttentionAlertEnabled } from "./attentionAlert";

// 머리줄의 "알림음" 스위치 — 켜면 비상·승인 요청이 늘 때 소리와 브라우저 알림을 낸다. 기본은 꺼짐.
// 브라우저 알림 권한은 사용자가 켜는 이 조작 안에서만 요청한다.
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
      onClick={handleToggle}
    >
      {isEnabled ? "알림음 켜짐" : "알림음 꺼짐"}
    </Button>
  );
};
