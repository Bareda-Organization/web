// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import {
  createAcademy,
  decideStaffSignupRequest,
  forceConfirmRun,
  getAcademies,
  getAcademy,
  getAcademyRunsLive,
  getAuditLogs,
  getBlockedAccounts,
  getEmergencies,
  getLoginHistory,
  getRunRoster,
  getStaffAccounts,
  getStaffSignupRequests,
  unblockAccount,
  updateAcademy,
  updateStaffAccount,
} from "./index";

// (admin) 8화면(academies·audit-log·blocked-accounts·emergency-alerts·
// force-confirm·member-accounts·member-approvals·monitoring)이 쓰는 §6 엔드포인트
// 16개 전부를 F5-W2 전용 백엔드에 붙여 확인한다. 이 라우트 그룹은 전부 sysadmin
// 전용이다(판단 근거, 보고서 §1).
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

describe("admin api — 실서버 계약", () => {
  it("getAcademies 는 학원 목록을 돌려준다(§6.1)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getAcademies();

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("getAcademy 는 학원 상세를 돌려준다(§6.3 GET)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getAcademy(1);

    expect(result.id).toBe(1);
    expect(Array.isArray(result.staffAccounts)).toBe(true);
  });

  // 시드 학원(1·2·3)을 건드리지 않도록 매 실행마다 고유한 이름으로 새 학원을
  // 만들고, 그 학원만 수정한다(판단 근거, 보고서 §1).
  it("createAcademy·updateAcademy 는 새 학원을 만들고 수정한다(§6.2·§6.3 PATCH)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));
    const suffix = Date.now().toString().slice(-8);

    const created = await createAcademy({
      name: `F5W2계약시험학원${suffix}`,
      region: "서울",
      address: "서울시 어딘가",
      contact: "02-0000-0000",
    });
    expect(created.academyId).toBeTruthy();

    await expect(updateAcademy(created.academyId, { memo: "F5-W2 계약 시험 메모" })).resolves.toBeUndefined();
  });

  it("getStaffSignupRequests 는 대기 중인 가입 요청 목록을 돌려준다(§6.4)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getStaffSignupRequests();

    expect(Array.isArray(result.items)).toBe(true);
  });

  // request_id=1(시드 "박대기")은 academy_id=1 에 이미 재직 중인 staff 가 있어
  // accept=true 를 줘도 상태를 바꾸지 않고 항상 409 로 거부된다(2026-09-14 curl
  // 로 확인) — 시드를 훼손하지 않는 안전한 재현이다(판단 근거, 보고서 §1).
  it("STAFF_QUOTA_EXCEEDED — 학원당 staff 1명 정원을 넘기면 409 로 거부된다(§6.5)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    await expect(decideStaffSignupRequest(1, { accept: true })).rejects.toMatchObject({
      status: 409,
      code: "STAFF_QUOTA_EXCEEDED",
    });
  });

  it("getStaffAccounts 는 staff 계정 목록을 돌려준다(§6.6)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getStaffAccounts();

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.some((item) => item.loginId === "staffC")).toBe(true);
  });

  // staffC(account_id=20)의 이름을 원래 값 그대로 다시 써 넣는 멱등 왕복 —
  // 시드를 실제로는 바꾸지 않으면서 PATCH 를 실백엔드로 검증한다(판단 근거, 보고서 §1).
  it("updateStaffAccount 는 staffC 의 이름을 원래 값으로 왕복 수정한다(§6.7)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await updateStaffAccount(20, { name: "한관리" });

    expect(result.accountId).toBe(20);
  });

  it("getAcademyRunsLive 는 학원의 실시간 회차 목록을 돌려준다(§6.8)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getAcademyRunsLive(1);

    expect(Array.isArray(result.runs)).toBe(true);
    expect(result.runs.length).toBeGreaterThan(0);
  });

  it("getRunRoster 는 회차의 정류장·학생 탑승 현황을 돌려준다(§6.9)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getRunRoster(3);

    expect(Array.isArray(result.stops)).toBe(true);
    expect(result.stops.length).toBeGreaterThan(0);
  });

  it("getBlockedAccounts 는 차단된 계정 목록을 돌려준다(§6.10)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getBlockedAccounts();

    expect(result.items.some((item) => item.loginId === "driverBlocked")).toBe(true);
  });

  it("getEmergencies 는 비상 상황 목록을 돌려준다(§6.11)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getEmergencies();

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  // AUTH_ACCOUNT_BLOCKED(목표 14) 재현 — auth 쪽 시험(features/auth/api/realBackend.test.ts)이
  // 기록한 대로, 로그인 실패 5회 누적으로 새 계정을 실제 차단 상태로 만드는
  // 경로는 백엔드 카운터 결함 때문에 막혀 있다. 그래서 이미 그 상태로 고정된
  // 시드 계정 driverBlocked(account_id=15, failed_attempts=5)로 AUTH_ACCOUNT_BLOCKED
  // 를 재현하고, 같은 계정으로 unblockAccount(§6.12)까지 한 시험에서 확인한다 —
  // 브리프가 제안한 "차단 후 즉시 해제" 조합을 시드 계정으로 대체한 것이
  // 이 시험의 판단 근거다(보고서 §1). unblockAccount 는 멱등이 아니므로
  // (두 번째 호출은 409 ACCOUNT_NOT_BLOCKED) 전체 실행에서 단 한 번만 돈다.
  it("AUTH_ACCOUNT_BLOCKED 재현 후 unblockAccount 로 해제한다(§1.4·§6.12·§8)", async ({ skip }) => {
    if (!backendReachable) skip();

    const blockedLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
      body: JSON.stringify({ login_id: "driverBlocked", password: "password" }),
    });
    const blockedJson = (await blockedLoginResponse.json()) as { error?: { code?: string } };
    expect(blockedLoginResponse.status).toBe(403);
    expect(blockedJson.error?.code).toBe("AUTH_ACCOUNT_BLOCKED");

    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));
    const unblocked = await unblockAccount(15);
    expect(unblocked.accountStatus).toBe("active");

    const afterUnblockLogin = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
      body: JSON.stringify({ login_id: "driverBlocked", password: "password" }),
    });
    expect(afterUnblockLogin.status).toBe(200);
  });

  it("getAuditLogs 는 감사 로그 목록을 돌려준다(§6.13)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getAuditLogs();

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("getLoginHistory 는 접속 이력 목록을 돌려준다(§6.13)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    const result = await getLoginHistory();

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  // run 3 은 시드 기준 "moving" 상태다 — force-confirm 은 idle 회차에만 허용되므로
  // 되돌릴 수 없는 성공 경로 대신 안전한 오류 경로만 재현한다(판단 근거, 보고서 §1).
  it("RUN_NOT_IDLE — idle 이 아닌 회차를 강제 확정하면 409 로 거부된다(§6.14)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    await expect(forceConfirmRun(3, "F5-W2 계약 시험")).rejects.toMatchObject({
      status: 409,
      code: "RUN_NOT_IDLE",
    });
  });

  it("RUN_NOT_FOUND — 존재하지 않는 회차를 강제 확정하면 404 로 거부된다(§6.14)", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "sysadmin"));

    await expect(forceConfirmRun(99999, "F5-W2 계약 시험")).rejects.toMatchObject({
      status: 404,
      code: "RUN_NOT_FOUND",
    });
  });
});
