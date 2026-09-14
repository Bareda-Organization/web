// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import {
  changePassword,
  getMe,
  getSignupStatus,
  login,
  reapplySignup,
  recoverAccount,
  registerDevice,
  searchAcademies,
  signup,
  unregisterDevice,
} from "./index";

// (auth) 3화면(login·signup·signup-status) + 화면 없는 §2 나머지 엔드포인트를
// F5-W2 전용 백엔드에 붙여 확인한다.
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

// `POST /auth/logout`·`POST /auth/refresh` (§2.6·§2.7)는 브라우저가 자동으로
// 저장·재전송하는 refresh_token 쿠키에 의존한다(`httpClient.ts` 의
// `credentials:"include"` 주석 — §1.2.1). Node/undici 의 `fetch()` 는 별도 호출
// 사이에 쿠키를 들고 있지 않아, 프로덕션 `logout()`/`refresh()` 를 그대로 부르면
// 유효한 액세스 토큰이 있어도 401 TOKEN_EXPIRED 로 실패한다(2026-09-14 curl 로
// sysadmin 계정에서도 동일 재현 — 계정 상태와 무관한 시험 환경의 한계다).
// 이 파일 전용으로 raw fetch 로 로그인해 Set-Cookie 를 직접 캡처하고, 이후
// 요청에 Cookie 헤더로 되먹인다 — 공용 헬퍼(`rawRestLogin.ts`)와 프로덕션
// 코드는 고치지 않는다(판단 근거, 보고서 §1).
async function rawLoginWithCookie(loginId: string, password = "password") {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
    body: JSON.stringify({ login_id: loginId, password }),
  });
  const json = (await response.json()) as { data?: { access_token?: string } };
  const accessToken = json.data?.access_token;
  const setCookie = response.headers.get("set-cookie");
  if (!response.ok || !accessToken || !setCookie) {
    throw new Error(`쿠키 포함 로그인 실패(${loginId}): status=${response.status}`);
  }
  return { accessToken, cookie: setCookie.split(";")[0] };
}

describe("auth api — 실서버 계약", () => {
  it("searchAcademies 는 공개 학원 검색 결과를 돌려준다(§2.1)", async ({ skip }) => {
    if (!backendReachable) skip();

    const results = await searchAcademies("바래다");

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  // 아래 일련의 시험이 공유하는 일회용 staff 계정 — signup(§2.2)으로 만들어
  // pending → rejected(관리자 raw fetch 반려) → pending(reapply) 순으로 전이시켜
  // AUTH_PENDING·AUTH_REJECTED 두 코드를 계정 하나로 재현한다(판단 근거, 보고서 §1).
  const suffix = Date.now().toString().slice(-8);
  const throwawayLoginId = `f5w2a${suffix}`;
  const throwawayPhone = `010-9${suffix}`;
  const throwawayName = `F5W2가입시험${suffix}`;
  let pendingAccessToken = "";
  let rejectedAccessToken = "";

  it("signup 은 staff 가입 요청을 pending 상태로 접수한다(§2.2)", async ({ skip }) => {
    if (!backendReachable) skip();

    const result = await signup({
      role: "staff",
      loginId: throwawayLoginId,
      password: "password",
      name: throwawayName,
      phone: throwawayPhone,
      academyId: "1",
    });

    expect(result.accountStatus).toBe("pending");
  });

  it("login 은 pending 계정도 로그인시키고 status=pending 을 돌려준다(§2.5)", async ({ skip }) => {
    if (!backendReachable) skip();

    const result = await login(throwawayLoginId, "password");

    expect(result.status).toBe("pending");
    pendingAccessToken = result.accessToken;
  });

  it("getSignupStatus 는 pending 계정의 심사 현황을 돌려준다 — pending 허용 목록 안(§1.4·§2.3)", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(pendingAccessToken);

    const result = await getSignupStatus();

    expect(result.status).toBe("pending");
  });

  it("getMe 는 pending 계정 정보를 돌려준다 — pending 허용 목록 안(§1.4·§2.10)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(pendingAccessToken);

    const me = await getMe();

    expect(me.loginId).toBe(throwawayLoginId);
    expect(me.status).toBe("pending");
  });

  it("registerDevice·unregisterDevice 는 pending 계정에서도 허용된다 — pending 허용 목록 안(§1.4·§2.11)", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(pendingAccessToken);
    const pushToken = `f5w2-push-${suffix}`;

    const registered = await registerDevice({
      token: pushToken,
      platform: "web",
      deviceId: `f5w2-device-${suffix}`,
    });
    expect(registered.deviceId).toBeTruthy();

    await expect(unregisterDevice(pushToken)).resolves.toBeUndefined();
  });

  it("changePassword 는 pending 허용 목록 밖이라 403 AUTH_PENDING 으로 거부된다(§1.4·§2.8·§8)", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(pendingAccessToken);

    await expect(
      changePassword({ currentPassword: "password", newPassword: "password2" }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(403);
      expect(apiError.code).toBe("AUTH_PENDING");
      return true;
    });
  });

  it("(관리자 raw fetch) 가입 요청을 반려해 계정을 rejected 로 전환한다(§6.5) — features/admin 을 import 하지 않는다", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    // admin 기능의 함수를 직접 import 하면 auth↔admin 기능 경계를 넘으므로
    // raw fetch 로 부른다(판단 근거, 보고서 §1) — sysadmin 로그인은 계약 시험
    // 공용 헬퍼(rawRestLogin)를 그대로 쓴다(쿠키가 필요 없는 호출이라 문제없다).
    const sysadminToken = await rawRestLogin(API_BASE_URL, "sysadmin");
    const listResponse = await fetch(`${API_BASE_URL}/admin/staff-signup-requests`, {
      headers: { Authorization: `Bearer ${sysadminToken}`, "X-Client-Type": "web" },
    });
    const listJson = (await listResponse.json()) as {
      data: { items: Array<{ request_id: number; name: string }> };
    };
    const target = listJson.data.items.find((item) => item.name === throwawayName);
    expect(target).toBeDefined();

    const decideResponse = await fetch(`${API_BASE_URL}/admin/staff-signup-requests/${target!.request_id}/decide`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sysadminToken}`,
        "Content-Type": "application/json",
        "X-Client-Type": "web",
      },
      body: JSON.stringify({ accept: false, reject_reason: "F5-W2 계약 시험 — 일회용 반려" }),
    });
    expect(decideResponse.status).toBe(200);
  });

  it("login 은 반려 계정도 로그인시키고 status=rejected 를 돌려준다(§2.5)", async ({ skip }) => {
    if (!backendReachable) skip();
    // httpClient.buildHeaders 는 apiFetch 요청마다 accessTokenStore 에 남아 있는
    // 토큰을 무조건 Authorization 으로 붙인다(/auth/login 도 예외가 아니다). 앞선
    // "login 은 pending 계정도" 시험이 pending 토큰을 store 에 남겨 두므로, 지우지
    // 않고 이 login() 을 부르면 그 낡은 pending 토큰이 실려 백엔드가 로그인 자체를
    // 403 AUTH_PENDING 으로 막는다(실측 — 판단 근거, 보고서 §2). login() 은 원래
    // 미인증 호출이어야 하므로 직전에 store 를 비운다.
    setAccessToken(null);

    const result = await login(throwawayLoginId, "password");

    expect(result.status).toBe("rejected");
    rejectedAccessToken = result.accessToken;
  });

  it("changePassword 는 rejected 허용 목록(pending 의 5개 + reapply) 밖이라 403 AUTH_REJECTED 로 거부된다(§1.4·§8)", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    setAccessToken(rejectedAccessToken);

    await expect(
      changePassword({ currentPassword: "password", newPassword: "password2" }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(403);
      expect(apiError.code).toBe("AUTH_REJECTED");
      return true;
    });
  });

  it("reapplySignup 은 반려 계정을 다시 pending 으로 되돌린다(§1.4·§2.4)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(rejectedAccessToken);

    const result = await reapplySignup("1");

    expect(result.status).toBe("pending");
  });

  it("recoverAccount 는 유효한 요청을 접수한다(§2.9)", async ({ skip }) => {
    if (!backendReachable) skip();
    // login() 과 같은 이유 — 이 호출도 미인증 엔드포인트인데, 앞선 changePassword·
    // reapplySignup 시험이 store 에 남긴 rejected 토큰이 그대로 실리면 계정 게이트가
    // 이 요청 자체를 403 AUTH_REJECTED 로 막는다(실측 — 판단 근거, 보고서 §2).
    setAccessToken(null);

    await expect(recoverAccount({ type: "login_id", phone: throwawayPhone })).resolves.toBeUndefined();
  });

  it("refresh 는 refresh_token 쿠키를 실으면 새 액세스 토큰을 돌려준다(raw fetch, §2.6)", async ({ skip }) => {
    if (!backendReachable) skip();
    const { cookie } = await rawLoginWithCookie(throwawayLoginId);

    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { Cookie: cookie, "X-Client-Type": "web" },
    });

    expect(refreshResponse.status).toBe(200);
    const json = (await refreshResponse.json()) as { data?: { access_token?: string } };
    expect(json.data?.access_token).toBeTruthy();
  });

  it("logout 은 refresh_token 쿠키를 실으면 204 로 성공한다(raw fetch, §2.7)", async ({ skip }) => {
    if (!backendReachable) skip();
    // refresh 는 쿠키를 회전시키므로(위 시험에서 확인) 이 시험은 별도 로그인으로
    // 새 쿠키를 받는다 — 앞 시험이 쓴 쿠키는 이미 회전되어 무효다.
    const { accessToken, cookie } = await rawLoginWithCookie(throwawayLoginId);

    const logoutResponse = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, Cookie: cookie, "X-Client-Type": "web" },
    });

    expect(logoutResponse.status).toBe(204);
  });

  // AUTH_ACCOUNT_BLOCKED(목표 14) — 2026-09-14 Ruling 282(로그인 실패 차단) 수정이
  // 병합되어 사양(§1.4) 그대로 재현된다. 실패 1~4회는 401 INVALID_CREDENTIALS 와 함께
  // remaining_attempts 가 4·3·2·1 로 줄고, 5회째부터는 계정이 차단돼 403
  // AUTH_ACCOUNT_BLOCKED 를 반환한다 — 그 뒤 올바른 비밀번호로 시도해도 이미
  // 차단된 상태라 마찬가지로 403 이다(조율자 실측, BE-A 병합 커밋 기준).
  it("로그인 실패가 5회 누적되면 계정이 차단돼 403 AUTH_ACCOUNT_BLOCKED 를 반환한다(§1.4·§8)", async ({
    skip,
  }) => {
    if (!backendReachable) skip();
    const blockSuffix = Date.now().toString().slice(-8);
    const blockLoginId = `f5w2b${blockSuffix}`;
    await signup({
      role: "staff",
      loginId: blockLoginId,
      password: "password",
      name: `F5W2차단시험${blockSuffix}`,
      phone: `010-8${blockSuffix}`,
      academyId: "1",
    });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
        body: JSON.stringify({ login_id: blockLoginId, password: "wrong-password" }),
      });
      const json = (await response.json()) as {
        error?: { code?: string; details?: { remaining_attempts?: number } };
      };
      expect(response.status).toBe(401);
      expect(json.error?.code).toBe("INVALID_CREDENTIALS");
      // 실측(2026-09-14, BE-A 병합 후): 실패 1~4회는 remaining_attempts 가 4·3·2·1 로 줄어든다.
      expect(json.error?.details?.remaining_attempts).toBe(5 - attempt);
    }

    const fifthAttemptResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
      body: JSON.stringify({ login_id: blockLoginId, password: "wrong-password" }),
    });
    const fifthAttemptJson = (await fifthAttemptResponse.json()) as { error?: { code?: string } };
    // 5회째 실패로 계정이 차단된다.
    expect(fifthAttemptResponse.status).toBe(403);
    expect(fifthAttemptJson.error?.code).toBe("AUTH_ACCOUNT_BLOCKED");

    const finalLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
      body: JSON.stringify({ login_id: blockLoginId, password: "password" }),
    });
    const finalLoginJson = (await finalLoginResponse.json()) as { error?: { code?: string } };
    // 사양(§1.4)대로 이미 차단된 계정은 올바른 비밀번호로도 403 AUTH_ACCOUNT_BLOCKED 다.
    expect(finalLoginResponse.status).toBe(403);
    expect(finalLoginJson.error?.code).toBe("AUTH_ACCOUNT_BLOCKED");
  });
});
