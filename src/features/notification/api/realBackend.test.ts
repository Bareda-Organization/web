// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { getNotifications } from "./index";

// 알림 로그 조회 화면(§5.17, NTF-10·11, A-13)이 부르는 엔드포인트를 실제 F5-W1
// 전용 백엔드에 붙여 확인한다. 조회 전용 화면이라(쓰기 엔드포인트 없음) 목록
// 조회만 검증한다.
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

describe("notification api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1) 학원에 여러 건의 알림 로그가 실재한다.

  it("getNotifications 는 staffA 학원의 알림 로그와 unacked_count 를 함께 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getNotifications(0);

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(typeof result.unackedCount).toBe("number");
    // 응답 식별자는 문자열이다(Ruling 332·357).
    expect(typeof result.items[0].notificationId).toBe("string");
  });
});
