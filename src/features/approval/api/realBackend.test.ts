// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import {
  decideChangeApproval,
  decideSignupRequest,
  getChangeApprovalDetail,
  getChangeApprovals,
  getSignupRequests,
} from "./index";

// 가입 승인(§5.1·§5.2, A-02)·구간 변경 승인(§5.5·§5.6, A-05) 화면이 부르는
// 엔드포인트를 실제 F5-W1 전용 백엔드에 붙여 확인한다.
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

describe("approval api — 실서버 계약", () => {
  it("getSignupRequests 는 pending 가입 요청 목록을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getSignupRequests("pending");

    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.pendingCount).toBe("number");
  });

  // r11-t1 — decideSignupRequest(§5.2, A-02) 실제 재현. request_id=2(role=parent,
  // academy_id=1)가 시드에서 유일하게 관계자가 결정할 수 있는 pending 건이다
  // (curl 실측). 승인은 학생 연결(link.studentIds)이 필요해 대상을 특정해야
  // 하므로, 거절(§5.2 의 다른 분기)로 결정한다 — 사유만 있으면 되고 학생 연결
  // 관문(LINK_REQUIRED)을 타지 않아 더 단순하다.
  //
  // 되돌릴 API 가 없는 편도 전이다(`SignupDecision.close` → `assertPending`).
  // 그래서 상태를 먼저 물어 분기한다 — 이번이 처음 실행이면 pending 이라 거절이
  // 성공하고, 이미 이전 회차에서 거절했다면 다시 호출했을 때 정확히
  // `409 APPROVAL_ALREADY_DECIDED` 로 막히는지를 확인한다(같은 오류 코드를
  // change-approval 쪽 시험이 이미 검증해 둔 것과 동일 — `SignupDecision` 이
  // 두 승인 축이 공유하는 클래스라 코드도 같다). 두 분기 모두 4번 연속 실행에서
  // 0 실패를 유지한다 — 1회차는 A, 2~4회차는 B 를 탄다.
  it("decideSignupRequest 는 pending 요청을 거절하거나, 이미 거절된 건은 409 로 막는다(request_id=2)", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const pending = await getSignupRequests("pending");
    const stillPending = pending.items.some((item) => item.requestId === 2);

    if (stillPending) {
      const result = await decideSignupRequest(2, {
        accept: false,
        rejectReason: "r11-t1 실서버 계약 시험 — 되돌릴 API 가 없어 거절로 소진",
      });
      expect(result.accountStatus).toBe("rejected");
    } else {
      await expect(
        decideSignupRequest(2, { accept: false, rejectReason: "r11-t1 실서버 계약 시험 재실행" }),
      ).rejects.toSatisfy((error: unknown) => {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(409);
        expect(apiError.code).toBe("APPROVAL_ALREADY_DECIDED");
        return true;
      });
    }
  });

  it("getChangeApprovals 는 상태별 구간 변경 승인 목록을 돌려준다(approved 필터)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    // 시드 기준(2026-09-14 curl 실측) — pending 0건, approved 1건(approval_id=2).
    const result = await getChangeApprovals("approved");

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  // 이 시험이 실제 결함을 하나 잡았다(보고서 §1·§2) — 이미 결정된 건(approved)은
  // 백엔드가 재최적화를 하지 않고 route_preview 등을 null 로 돌려주는데(백엔드
  // `StaffApprovalControllerTest#결정된_건의_상세_조회는_재최적화를_실행하지_않는다`
  // 와 동일 계약), 처음 이 시험을 돌렸을 때 프런트 코드가 그 null 을 못 다뤄
  // `TypeError: Cannot read properties of null (reading 'stops_before')` 로 죽었다.
  // `changeApprovals.ts`·`approval/types/index.ts`·`ChangeApprovalDetail.tsx` 를
  // null 을 다루도록 고친 뒤 이 단언을 추가했다.
  it("getChangeApprovalDetail 은 이미 승인된 건(approval_id=2)의 상세를 null 미리보기와 함께 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getChangeApprovalDetail(2);

    expect(result.approvalId).toBe(2);
    expect(result.routePreview).toBeNull();
    expect(result.previewToken).toBeNull();
    expect(result.estTimeBefore).toBeNull();
    expect(result.estTimeAfter).toBeNull();
  });

  // 목표 4 — APPROVAL_ALREADY_DECIDED 실제 재현. approval_id=2 는 시드 상태로
  // 이미 "approved" 다 — 이미 처리된 건을 다시 결정하면 무조건 이 오류로
  // 단락되므로(백엔드가 이미결정 여부를 preview_token 검증보다 먼저 본다,
  // 2026-09-14 curl 로 확인) 위조 토큰을 써도 상태를 바꾸지 않는 안전한
  // 재현이다.
  it("APPROVAL_ALREADY_DECIDED — 이미 결정된 승인 건을 다시 결정하면 409 로 거부된다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    await expect(
      decideChangeApproval(2, { approve: true, previewToken: "bogus-stale-token-from-contract-test" }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.code).toBe("APPROVAL_ALREADY_DECIDED");
      return true;
    });
  });

  // PREVIEW_STALE 실제 재현(Ruling 299 → V12 마이그레이션). r7-t2 는 이 시드에서
  // 불가능하다고 판정했다 — `route` 행이 direction='to_academy' 하나뿐이라 대기
  // 중인 CR#1(run_id=2, direction='from_academy')이 (academy, bus, weekday,
  // direction) 4중 일치 관문(`ApprovalQueryService.detail()`)을 못 넘어
  // ROUTE_NOT_CONFIGURED_FOR_RUN(422)으로 막혔다. `db/migration-local/V12`가
  // 같은 run 의 weekday·direction 에 맞는 route+route_stop 을 더해 이 관문을
  // 열었다(curl 실측, 2026-09-17: GET 이 이제 preview_token 을 담은 200 을
  // 돌려준다). PREVIEW_STALE 자체는 그 뒤에 위조 토큰으로 decide 를 불러
  // 재현한다 — 진짜 토큰과 다르면 백엔드가 "미리보기 이후 변경됨"으로 판정한다.
  //
  // previewStale 값도 이제 단언한다(r9-t1, 목표 4) — r8-t1 은 "실행 순서에
  // 좌우된다" 며 포기했으나, 원인은 `DevResetService.reset()` 이 인메모리 미리보기
  // 캐시를 안 비운 것이었다(r9-t1 목표 1·2 로 고침, `DevResetServiceTest` 가
  // 고정). 지금은 `vitest.globalSetup.ts` 의 실행당 1회 리셋이 캐시까지 비우고,
  // 이 스위트 안에서 run_id=2(CR#1 이 속한 회차)의 명단·노선을 바꾸는 시험이
  // 없어(`run/api` 는 run_id=6 만 바꾼다) approval_id=1 의 지문(fingerprint)이
  // 이 실행 내내 변하지 않는다 — 몇 번째 조회든 첫 조회이거나 지문이 같아
  // `stale=false` 로 고정된다(`ApprovalPreviewResolver.resolvePreview` 참고).
  it("getChangeApprovalDetail(1) 은 대기 중인 건의 상세를 preview_token 과 함께 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getChangeApprovalDetail(1);

    expect(result.approvalId).toBe(1);
    expect(result.previewToken).not.toBeNull();
    expect(result.previewStale).toBe(false);
  });

  it("PREVIEW_STALE — 위조된 preview_token 으로 결정하면 409 로 거부된다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    await expect(
      decideChangeApproval(1, { approve: true, previewToken: "00000000-0000-0000-0000-000000000000" }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.code).toBe("PREVIEW_STALE");
      return true;
    });
  });
});
