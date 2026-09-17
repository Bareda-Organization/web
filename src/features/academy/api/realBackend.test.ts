// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { getAcademySettings, updateAcademySettings } from "./index";

// 학원 설정 화면(§5.21, A-17)이 부르는 조회·수정 엔드포인트를 실제 F5-W1
// 전용 백엔드에 붙여 확인한다.
const API_BASE_URL = requireRealBackendApiBaseUrl();

let backendReachable = false;

beforeAll(async () => {
  try {
    await fetch(`${API_BASE_URL}/academies/search?q=바래다`);
    backendReachable = true;
  } catch {
    backendReachable = false;
  }
}, 10_000);

describe("academy api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1) 학원의 noShowWaitMinutes 현재값 3.

  it("getAcademySettings 는 staffA 학원의 미승차 대기시간 설정을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getAcademySettings();

    expect(result.noShowWaitMinutes).toBe(3);
  });

  // 3→5→3 왕복으로 시드를 원상태로 되돌린다(2026-09-14 curl 로 먼저 확인한
  // 가역 경로).
  it("updateAcademySettings 로 바꾼 값을 다시 원래대로 되돌릴 수 있다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const original = await getAcademySettings();
    expect(original.noShowWaitMinutes).toBe(3);

    try {
      const changed = await updateAcademySettings({ noShowWaitMinutes: 5 });
      expect(changed.noShowWaitMinutes).toBe(5);
    } finally {
      const restored = await updateAcademySettings({ noShowWaitMinutes: 3 });
      expect(restored.noShowWaitMinutes).toBe(3);
    }
  });
});
