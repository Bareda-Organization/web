import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifyAttention } from "./attentionAlert";

const NotificationMock = vi.fn();
const AudioContextMock = vi.fn();

// 이 실행 환경(Node + jsdom)은 localStorage 를 주지 않아 메모리 저장소로 대신한다.
const storageWith = (values: Record<string, string>) => ({
  getItem: (key: string) => values[key] ?? null,
  setItem: () => undefined,
});

describe("notifyAttention", () => {
  beforeEach(() => {
    NotificationMock.mockClear();
    AudioContextMock.mockClear();
    vi.stubGlobal("Notification", Object.assign(NotificationMock, { permission: "granted" }));
    vi.stubGlobal("AudioContext", AudioContextMock);
  });

  it("이미 켜 둔 사람(저장값 on)에게는 브라우저 알림만 내고 소리는 내지 않는다", () => {
    vi.stubGlobal("localStorage", storageWith({ "attention-alert-enabled": "on" }));

    notifyAttention("비상 알림", "확인하지 않은 비상 알림이 1건 있습니다.");

    expect(NotificationMock).toHaveBeenCalledWith("비상 알림", { body: "확인하지 않은 비상 알림이 1건 있습니다." });
    expect(AudioContextMock).not.toHaveBeenCalled();
  });

  it("꺼져 있으면 아무 것도 내지 않는다", () => {
    vi.stubGlobal("localStorage", storageWith({}));

    notifyAttention("비상 알림", "본문");

    expect(NotificationMock).not.toHaveBeenCalled();
    expect(AudioContextMock).not.toHaveBeenCalled();
  });
});
