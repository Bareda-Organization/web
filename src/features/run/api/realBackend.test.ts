// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { resetRealBackendSeedIfConfigured } from "@/shared/testing/realBackendReset";
import { getDashboard, getManagers, getRunRoster, getRunsLive, patchRunAssignment, postForcedAdd } from "./index";

// 대시보드·오늘의 회차 화면(§5.3·§5.4·§5.13·§5.18, A-03·A-04·A-06·A-14)이 부르는
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

    const result = await getRunRoster("2");

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

    await expect(getRunRoster("2")).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(403);
      expect(apiError.code).toBe("ACADEMY_SCOPE_VIOLATION");
      return true;
    });
  });

  // r11-t1 — patchRunAssignment(§5.14, A-06) 실제 재현. run_id=6(R6)은 idle·미배치
  // (V2__seed_data.sql 시드 기준, curl 실측). 배치 해제 API 가 부재해(되돌릴 수단이
  // 없는 편도 전이 — `AssignmentCommandService.place`), 이미 채워진 자리는 REPLACE
  // 만 가능하다. 하지만 <b>같은 managerId 로 다시 보내는 것은 멱등</b>이다(`reassign`
  // 이 같은 값으로 다시 저장할 뿐 새 행도 충돌도 만들지 않음, 서버 코드 확인) —
  // 그래서 반복 실행에도 항상 같은 응답을 낸다. 또한 이 파일 끝의 afterAll 이 이
  // run_id=6 을 포함해 전체를 시드로 되돌리므로(위 postForcedAdd 때문에 이미
  // 걸려 있음), 다음 라운드에서도 "미배치" 상태로 다시 시작한다 — 새 되돌림 장치를
  // 만들지 않고 이미 있는 것을 그대로 쓴 것.
  it("patchRunAssignment 는 기사·동승자를 배치하고 배치 결과를 돌려준다(run_id=6)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await patchRunAssignment("6", { driverManagerId: "1", escortManagerId: "3" });

    expect(result.runId).toBe("6");
    const driver = result.assignments.find((a) => a.role === "driver");
    const escort = result.assignments.find((a) => a.role === "escort");
    expect(driver?.managerId).toBe("1");
    expect(escort?.managerId).toBe("3");
  });

  // r7-t2 목표 4 — CAPACITY_EXCEEDED 실제 재현. run_id=6(R6)은 idle·출발 4시간 전
  // 전용 ①구간 시나리오로 시드에 마련돼 있다(V2__seed_data.sql 주석 — R1 과 같은
  // 학원·버스·방향이라 같은 고정 노선(route 1)이 매칭된다). bus 1 의
  // student_capacity=14, route 1 이 매칭하는 승하차지(stop 1·2)를 쓰는 학생은
  // student 1·2 뿐이라 projected=2. `projected + staged + 1 > 14` 이므로 12번
  // 성공(staged=12, 2+12+1=15>14 성립 직전) 뒤 13번째에서 막힌다. 주소는 실
  // 지오코딩이 통과하는 것으로 이미 확인된 값(`NaverGeocodingClientLiveTest`
  // 의 `SEOUL_CITY_HALL`)을 그대로 쓴다 — `ForcedAdditionStore` 는 주소·학생명
  // 중복을 막지 않으므로 재사용해도 안전하다(서버 코드 확인).
  it("postForcedAdd 를 반복하면 정원을 넘겨 409 CAPACITY_EXCEEDED 로 거부된다(run_id=6)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const REAL_ADDRESS = "서울특별시 중구 세종대로 110";
    for (let i = 0; i < 12; i += 1) {
      const result = await postForcedAdd("6", {
        newStudentName: `r7t2-정원초과검증-${i}`,
        address: REAL_ADDRESS,
        note: "r7-t2 CAPACITY_EXCEEDED 재현용 — 이 파일의 afterAll 에서 시드로 되돌림",
      });
      expect(result.status).toBe("staged");
    }

    await expect(
      postForcedAdd("6", {
        newStudentName: "r7t2-정원초과검증-13",
        address: REAL_ADDRESS,
        note: "r7-t2 CAPACITY_EXCEEDED 재현용",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.code).toBe("CAPACITY_EXCEEDED");
      return true;
    });
  });
});

// r7-t2 목표 6 — 위 강제 추가 12건은 되돌릴 API 가 없다(§5.7 은 저장만 하고 끝나며
// 취소 엔드포인트가 부재). 유일한 되돌림 수단은 시드 전체 재구성(`POST /dev/reset`)
// 뿐이라 이 파일이 끝난 뒤 무조건 돌린다 — `resetRealBackendSeedIfConfigured` 는
// 이미 있는 헬퍼를 그대로 재사용한 것(새 되돌림 장치를 만들지 않음). 이 파일은
// 이 강제 추가 시나리오 때문에 항상 상태를 남기므로 "값싸게 먼저 확인" 분기를
// 두지 않고 매번 돈다 — 판단 근거는 보고서 §1.
afterAll(async () => {
  await resetRealBackendSeedIfConfigured();
});
