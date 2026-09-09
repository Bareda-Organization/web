import { apiFetch } from "@/shared/lib/http";
import type { DeviceRegisterRequestTypes, DeviceRegisterResponseTypes } from "../types";

// POST /me/devices · DELETE /me/devices/{token} (§2.11, NTF-12) — pending 포함
// 인증된 전 역할. §1.2 가 "§2 는 절 11개지만 호출은 12개"라 명시한 그 갈라진 절이다.
// ⚠ 실 푸시(FCM·APNs) 인프라가 없어 F2 화면에는 연결하지 않았다 — 존재는 curl 로 확인.
export const registerDevice = async (
  request: DeviceRegisterRequestTypes,
): Promise<DeviceRegisterResponseTypes> => {
  const response = await apiFetch<{ device_id: string; registered_at: string }>("/me/devices", {
    method: "POST",
    body: {
      token: request.token,
      platform: request.platform,
      device_id: request.deviceId,
      app_version: request.appVersion,
    },
  });
  return { deviceId: response.device_id, registeredAt: response.registered_at };
};

export const unregisterDevice = async (token: string): Promise<void> => {
  await apiFetch<void>(`/me/devices/${encodeURIComponent(token)}`, { method: "DELETE" });
};
