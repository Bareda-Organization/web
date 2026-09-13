// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { createBus, getBuses } from "./index";

// 차량 관리 화면(§5.12, BUS-01·02, A-11)이 부르는 엔드포인트를 실제 F5-W1
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

describe("bus api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1) 소속 버스 2대("1호차"·"2호차").

  it("getBuses 는 staffA 학원의 버스 목록을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getBuses(0);

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(typeof result.items[0].studentCapacity).toBe("number");
  });

  // DUPLICATE_BUS_NO 실제 재현 — 이미 등록된 "1호차" 로 재등록을 시도하면 409 로
  // 거부된다(2026-09-14 curl 로 먼저 확인). 등록이 거부되므로 되돌릴 부작용이 없다.
  it("createBus — 이미 있는 bus_no(1호차)로 등록하면 409 DUPLICATE_BUS_NO 로 거부된다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    await expect(
      createBus({ busNo: "1호차", plateNo: "99가9999", capacity: 10, operable: true }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.code).toBe("DUPLICATE_BUS_NO");
      return true;
    });
  });
});
