import { apiFetch } from "@/shared/lib/http";
import type { AcademySettingsResponseTypes, UpdateAcademySettingsRequestTypes } from "../types";

type RawAcademySettings = {
  no_show_wait_minutes: number;
};

const toSettings = (raw: RawAcademySettings): AcademySettingsResponseTypes => ({
  noShowWaitMinutes: raw.no_show_wait_minutes,
});

// GET /staff/academy-settings (§5.21, A-17).
export const getAcademySettings = async (): Promise<AcademySettingsResponseTypes> => {
  const raw = await apiFetch<RawAcademySettings>("/staff/academy-settings", { method: "GET" });
  return toSettings(raw);
};

// PATCH /staff/academy-settings — 범위 1~30 을 벗어나면 422 VALIDATION_FAILED
// (Ruling 257). 화면은 서버 판정을 그대로 노출하고 클라이언트에서 별도로
// 막지 않는다(단일 진실 공급원은 서버).
export const updateAcademySettings = async (
  body: UpdateAcademySettingsRequestTypes,
): Promise<AcademySettingsResponseTypes> => {
  const raw = await apiFetch<RawAcademySettings>("/staff/academy-settings", {
    method: "PATCH",
    body: { no_show_wait_minutes: body.noShowWaitMinutes },
  });
  return toSettings(raw);
};
