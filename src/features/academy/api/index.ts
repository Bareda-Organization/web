import { apiFetch } from "@/shared/lib/http";
import type {
  AcademyInfoTypes,
  AcademyPolicyTypes,
  AcademySettingsResponseTypes,
  UpdateAcademySettingsRequestTypes,
} from "../types";

// Ruling 820 — academy·policy 는 GET 에만 오고(아직 안 주는 서버도 있다), academy 안의 code·region·status 도 없을 수 있다.
type WireAcademySettings = Omit<AcademySettingsResponseTypes, "academy" | "policy"> & {
  academy?: (Pick<AcademyInfoTypes, "name"> & Partial<AcademyInfoTypes>) | null;
  policy?: AcademyPolicyTypes | null;
};

const toSettings = (raw: WireAcademySettings): AcademySettingsResponseTypes => ({
  ...raw,
  academy: raw.academy
    ? { name: raw.academy.name, code: raw.academy.code ?? null, region: raw.academy.region ?? null, status: raw.academy.status ?? null }
    : null,
  policy: raw.policy ?? null,
});

// GET /staff/academy-settings (§5.21, A-17).
export const getAcademySettings = async (): Promise<AcademySettingsResponseTypes> => {
  const raw = await apiFetch<WireAcademySettings>("/staff/academy-settings", { method: "GET" });
  return toSettings(raw);
};

// PATCH /staff/academy-settings — 범위 1~30 을 벗어나면 422 VALIDATION_FAILED
// (Ruling 257). 화면은 서버 판정을 그대로 노출하고 클라이언트에서 별도로
// 막지 않는다(단일 진실 공급원은 서버).
export const updateAcademySettings = async (
  body: UpdateAcademySettingsRequestTypes,
): Promise<AcademySettingsResponseTypes> => {
  const raw = await apiFetch<WireAcademySettings>("/staff/academy-settings", {
    method: "PATCH",
    body: { no_show_wait_minutes: body.noShowWaitMinutes },
  });
  return toSettings(raw);
};
