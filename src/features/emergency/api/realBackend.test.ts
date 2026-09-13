// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { getEmergencies } from "./index";

// 비상 신고 조회 화면(§5.16, EXC-04, A-16)이 부르는 엔드포인트를 실제 F5-W1
// 전용 백엔드에 붙여 확인한다. ackEmergency 는 되돌릴 방법(unack 엔드포인트)이
// 없는 비가역 상태 변경이라, 시드에 남은 유일한 미확인 건(emergency_id=1)을
// 이 계약 시험에서 소진하지 않기 위해 다루지 않는다.
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

describe("emergency api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1) 학원에 비상 신고 1건
  // (emergency_id=1, type=vehicle_fault, run_id=3, bus_no=2호차, acked=false).

  it("getEmergencies 는 staffA 학원의 비상 신고 목록과 unacked_count 를 함께 돌려준다", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getEmergencies();

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
    expect(typeof result.unackedCount).toBe("number");
    expect(typeof result.items[0].emergencyId).toBe("number");
  });
});
