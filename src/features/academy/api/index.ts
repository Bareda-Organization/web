import { apiFetch } from "@/shared/lib/http";
import type { AcademySettingsResponseTypes, UpdateAcademySettingsRequestTypes } from "../types";

type RawAcademySettings = {
  no_show_wait_minutes: number;
  // Ruling 820 — GET 에만. 아직 안 주는 서버를 견디려고 선택 필드로 둔다.
  academy?: { name: string; code?: string | null; region?: string | null; status?: string | null } | null;
  policy?: {
    confirm_lead_minutes: number;
    start_window_minutes: number;
    change_quota_per_run: number;
    delay_unit_minutes: number;
    proximity_alert_meters: number;
    notification_retention_days: number;
  } | null;
};

const toSettings = (raw: RawAcademySettings): AcademySettingsResponseTypes => ({
  noShowWaitMinutes: raw.no_show_wait_minutes,
  academy: raw.academy ? { name: raw.academy.name, code: raw.academy.code ?? null, region: raw.academy.region ?? null, status: raw.academy.status ?? null } : null,
  policy: raw.policy
    ? {
        confirmLeadMinutes: raw.policy.confirm_lead_minutes,
        startWindowMinutes: raw.policy.start_window_minutes,
        changeQuotaPerRun: raw.policy.change_quota_per_run,
        delayUnitMinutes: raw.policy.delay_unit_minutes,
        proximityAlertMeters: raw.policy.proximity_alert_meters,
        notificationRetentionDays: raw.policy.notification_retention_days,
      }
    : null,
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
