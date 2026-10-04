import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttentionAlertToggle } from "./AttentionAlertToggle";
import { isAttentionAlertEnabled } from "./attentionAlert";

const requestPermission = vi.fn(async () => "granted" as NotificationPermission);

// 이 실행 환경(Node + jsdom)은 localStorage 를 주지 않아 메모리 저장소로 대신한다.
const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};

describe("AttentionAlertToggle", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    requestPermission.mockClear();
    vi.stubGlobal("Notification", Object.assign(vi.fn(), { permission: "default", requestPermission }));
  });

  it("기본은 꺼짐이고 권한도 묻지 않는다", () => {
    render(<AttentionAlertToggle />);

    expect(screen.getByRole("button", { name: /브라우저 알림 꺼짐/ })).toHaveAttribute("aria-pressed", "false");
    expect(isAttentionAlertEnabled()).toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  // R48 U-10 — 상태 글자인지 버튼인지 알 수 없었다. 꺼진 상태가 다음 행동(켜기)과 함께 보이고, 왜 켜는지 title 로 알린다.
  it("꺼져 있으면 '꺼짐 · 켜기' 로 다음 행동을 함께 보이고 title 로 이유를 알린다", () => {
    render(<AttentionAlertToggle />);

    const button = screen.getByRole("button", { name: "브라우저 알림 꺼짐 · 켜기" });
    expect(button).toHaveAttribute("title", "켜 두면 다른 탭을 보고 있을 때도 새 알림을 알려 줍니다");
  });

  it("눌러서 켤 때만 브라우저 알림 권한을 요청하고, 다시 누르면 꺼진다", async () => {
    render(<AttentionAlertToggle />);

    fireEvent.click(screen.getByRole("button", { name: /브라우저 알림 꺼짐/ }));
    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
    expect(isAttentionAlertEnabled()).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /브라우저 알림 켜짐/ }));
    expect(isAttentionAlertEnabled()).toBe(false);
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });
});
