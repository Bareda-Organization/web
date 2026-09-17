// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { decideChangeApproval, getChangeApprovalDetail, getChangeApprovals, getSignupRequests } from "./index";

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

  // r7-t2 목표 5 — PREVIEW_STALE 재현 시도, 이 시드에서는 불가능으로 판정(보고서
  // §2). `ApprovalQueryService.detail()` 은 PENDING 건마다 ①run.status==IDLE 이면
  // RUN_NOT_CONFIRMED 로 막고 ②그 외엔 (academy, bus, weekday, direction) 4중
  // 일치하는 `route` 행을 요구하는데(ROUTE_NOT_CONFIGURED_FOR_RUN), 이 시드 DB
  // 전체에 `route` 행이 단 1개(academy 1·bus 1·thu·to_academy)뿐이고 그 조합과
  // 일치하는 비-IDLE run 이 전 학원 통틀어 0건이다(psql 로 직접 대조 확인 —
  // `run WHERE status != 'idle'` 5건 전부 direction·weekday·academy 중 하나 이상이
  // 어긋난다). 즉 어떤 PENDING 승인 건의 상세 조회도 seed 상태로는 preview_token
  // 을 받을 수 없다 — 시드의 CR#1(run_id=2)도 예외가 아니다. §3.8 로 새 CR 을
  // 만들어도 같은 run 을 참조하는 한 같은 이유로 막힌다.
});
