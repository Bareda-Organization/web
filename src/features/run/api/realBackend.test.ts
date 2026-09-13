// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { getDashboard, getManagers, getRunRoster, getRunsLive } from "./index";

// 대시보드·오늘의 회차 화면(§5.3·§5.4·§5.13·§5.18, A-03·A-04·A-06)이 부르는
// 엔드포인트를 실제 F5-W1 전용 백엔드(NEXT_PUBLIC_API_BASE_URL)에 붙여 확인한다 —
// `NEXT_PUBLIC_API_BASE_URL=http://localhost:8130 npm test` 로 실행. 미지정이면
// `requireRealBackendApiBaseUrl()` 이 즉시 던진다(기본값 8080 으로 조용히 새는 것을 막음).
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

describe("run api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1)·staffB(academy_id=2).
  // run_id=2 는 staffA 학원 소속 확정 회차(2026-09-12 curl 실측 — roster 2명).

  it("getDashboard 는 staffA 학원의 지표·회차 목록을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getDashboard();

    expect(result.metrics).toBeDefined();
    expect(typeof result.metrics.movingBuses).toBe("number");
    expect(Array.isArray(result.runs)).toBe(true);
    expect(result.runs.length).toBeGreaterThan(0);
  });

  it("getRunsLive 는 이동 중인 회차만 돌려준다(현재 0건이어도 배열 형태는 유효)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getRunsLive();

    expect(Array.isArray(result.runs)).toBe(true);
  });

  it("getRunRoster 는 자기 학원 회차(run_id=2)의 탑승자 명단을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getRunRoster(2);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("studentId");
    expect(result[0]).toHaveProperty("status");
  });

  it("getManagers 는 배치 대화상자 후보 목록(§5.14 부수 조회)을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getManagers();

    expect(Array.isArray(result)).toBe(true);
  });

  // 목표 4 — ACADEMY_SCOPE_VIOLATION 실제 재현. staffB(학원 2)가 학원 1 소속
  // run_id=2 의 명단을 조회하면 403 로 거부된다(2026-09-14 curl 로 먼저 확인한
  // 반응을 그대로 자동화한 것 — 조회 전용이라 되돌릴 부작용이 없다).
  it("ACADEMY_SCOPE_VIOLATION — staffB(학원 2)가 남의 학원 회차 명단을 조회하면 403 로 거부된다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffB"));

    await expect(getRunRoster(2)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(403);
      expect(apiError.code).toBe("ACADEMY_SCOPE_VIOLATION");
      return true;
    });
  });
});
