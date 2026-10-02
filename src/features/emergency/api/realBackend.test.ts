// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { resetRealBackendSeedIfConfigured } from "@/shared/testing/realBackendReset";
import { ackEmergency, getEmergencies } from "./index";

// 비상 신고 조회 화면(§5.16, EXC-04, A-16)이 부르는 엔드포인트를 실제 F5-W1
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
    // 응답 식별자는 문자열이다(Ruling 332·357).
    expect(typeof result.items[0].emergencyId).toBe("string");
    // R47 Ruling 744 — 단말이 누른 시각이 참고값으로 실려 온다.
    expect(typeof result.items[0].occurredAt).toBe("string");
  });

  // r12-t1 목표1① — ackEmergency(§5.16, EXC-04, A-16) 실제 재현. emergency_id=1 은
  // 되돌릴 API(unack)가 없는 편도 전이다(ErrorCode.ALREADY_ACKED, api/index.ts 주석).
  // ⚠ vitest.globalSetup.ts 의 `/dev/reset` 은 매 `vitest run` 실행마다 무조건
  // 불려 DB 를 시드로 되돌린다(DevResetController "DB 를 시드 상태로 되돌리고" —
  // cleared_position_keys 만 보여 캐시 정리로 오인하기 쉽지만 실제로는 Flyway
  // clean+migrate 전체 재시드다, 실측 확인). 즉 "이전 회차에서 확인해 뒀다" 는
  // 상태는 다음 실행에서 항상 사라진다 — 회차를 걸친 상태-먼저-확인 분기(approval
  // 계약 시험의 decideSignupRequest 패턴)는 이 엔드포인트에 적용할 수 없다.
  // 그래서 두 분기(성공·409)를 한 시험 안에서 연달아 실행해 자체 완결시킨다 —
  // 첫 호출이 확인 처리하고, 그 직후 같은 실행 안에서 두 번째 호출이 정확히
  // 409 ALREADY_ACKED 로 막히는지를 같은 시험이 직접 만든다.
  it("ackEmergency 는 미확인 신고를 확인 처리하고, 이미 확인된 건은 다시 불러도 409 로 막는다(emergency_id=1)", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const before = await getEmergencies();
    const target = before.items.find((item) => item.emergencyId === "1");

    // 리셋이 비활성화된 환경(§ 위 주석 "실패해도 조용히 넘어간다")에서 이미 확인된
    // 채로 시작할 수도 있다 — 그때만 최초 확인 호출을 건너뛴다.
    if (target && !target.acked) {
      const result = await ackEmergency("1", "현장 확인 완료 — 학부모 연락함");
      // 응답 식별자는 문자열이다(Ruling 332·357).
      expect(result.emergencyId).toBe("1");
      expect(typeof result.ackedAt).toBe("string");

      // 기본 조회(status 미지정)는 open 만 돌려줘 확인 처리한 건이 빠진다(실측 확인)
      // — status="acked" 로 다시 물어야 방금 확인한 건이 보인다.
      const after = await getEmergencies({ status: "acked" });
      const updated = after.items.find((item) => item.emergencyId === "1");
      expect(updated?.acked).toBe(true);
      // R46-FUFEAT ② — 확인할 때 남긴 조치 메모가 acked_by.memo 로 돌아온다(§5.16 · Ruling 541).
      expect(updated?.ackedBy?.memo).toBe("현장 확인 완료 — 학부모 연락함");
    }

    // 같은 실행 안에서 곧바로 다시 부른다 — 방금(또는 이전에) 확인된 건이라
    // 정확히 409 ALREADY_ACKED 로 막혀야 한다.
    await expect(ackEmergency("1")).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.code).toBe("ALREADY_ACKED");
      return true;
    });
  });
});

// 이 파일은 시드의 유일한 비상 신고(emergency_id=1)를 확인 처리(ack)해 **되돌릴 API 가 부재**하다
// (재확인 해제 엔드포인트가 없다). 그대로 두면 뒤에 도는 파일이 `getEmergencies` 를 불렀을 때
// 미확인 건이 0개가 되어, 코드 결함이 아닌데도 실패한다 — 2026-09-19 R15 병합 검증에서
// `features/admin/api/realBackend.test.ts` 의 §6.11 시험이 실제로 그렇게 깨졌다(단독 실행은 통과).
// 유일한 되돌림 수단은 시드 전체 재구성(`POST /dev/reset`)뿐이라 이 파일이 끝난 뒤 무조건 돌린다
// — `run/api/realBackend.test.ts` 와 같은 근거이며 같은 헬퍼를 그대로 재사용한다.
afterAll(async () => {
  await resetRealBackendSeedIfConfigured();
});
