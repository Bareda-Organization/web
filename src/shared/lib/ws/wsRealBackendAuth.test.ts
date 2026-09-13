// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { createStompClient, type StompFrameLike } from "./stompClient";
import { academyLiveDestination, adminLiveDestination } from "./wsChannel";

// 실제 백엔드로 STOMP CONNECT·SUBSCRIBE 인가 경계를 확인하는 계약 시험 —
// `frontend/apps/parent-app/test/integration/real_backend_p3_test.dart` 와
// 같은 목적("최소한의 실백엔드 검증": 인가 경계만, 이벤트 왕복 전체가 아님)을
// 이 앱이 실제로 구독하는 채널 2개(`/topic/academy/{id}/live` ·
// `/topic/admin/live`)에 맞춰 옮긴 것이다. 51개 시험 파일 중 이 파일 하나만
// 실제 서버에 접속한다 — 나머지는 전부 `useRealtimeChannel`·`api` 를 가짜로
// 바꿔 화면 로직만 본다.
//
// `AcademyRealtimeClient` 대신 `createStompClient`(낮은 층)를 직접 쓴다 —
// 그 클라이언트는 STOMP 오류 프레임의 `message` 헤더가 문자열 그대로
// "FORBIDDEN" 일 때만 forbidden 으로 인식하고 "ACADEMY_SCOPE_VIOLATION" 은
// 걸러내지 못한다(좁은 문자열 대조). 이 시험은 앱 클라이언트의 해석이 아니라
// 서버가 실제로 내려주는 인가 경계 자체를 보는 것이 목적이라 원시 프레임을
// 직접 읽는 `createStompClient` 를 쓴다 — 판단 근거.
//
// 토큰 발급도 `login()`(features/auth) 대신 REST 를 직접 호출한다 —
// `accessTokenStore.ts` 는 앱 전역에서 공유하는 슬롯 하나뿐이라, 이 파일처럼
// 한 시험 파일 안에서 로그인 4~5회를 서로 다른 계정으로 연달아 부르면 나중
// 로그인이 앞 로그인의 토큰을 덮어써 버린다 — 그 공유 슬롯을 아예 건드리지
// 않는 것이 가장 단순한 회피다 — 판단 근거.
const API_HOST = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const API_BASE_URL = `${API_HOST}/api/v1`;
const WS_BASE_URL = (() => {
  const scheme = API_HOST.startsWith("https://") ? "wss://" : "ws://";
  const host = API_HOST.replace(/^https?:\/\//, "");
  return `${scheme}${host}/ws/location`;
})();

let backendReachable = false;

beforeAll(async () => {
  // Dart 쪽(`real_backend_p3_test.dart`)과 같은 판정 — 응답을 받으면(오류
  // 응답 포함) 도달 가능, fetch 자체가 던지는 경우(연결 거부·DNS 실패 등)만
  // 도달 불가로 본다.
  try {
    await fetch(`${API_BASE_URL}/academies/search?q=바래다`);
    backendReachable = true;
  } catch {
    backendReachable = false;
  }
}, 10_000);

async function rawLogin(loginId: string, password = "password"): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
    body: JSON.stringify({ login_id: loginId, password }),
  });
  const json = (await response.json()) as { data?: { access_token?: string } };
  const token = json.data?.access_token;
  if (!response.ok || !token) {
    throw new Error(`로그인 실패(${loginId}): status=${response.status} body=${JSON.stringify(json)}`);
  }
  return token;
}

type StompConnection = {
  connected: Promise<void>;
  errorFrame: Promise<StompFrameLike>;
  subscribe: (destination: string) => void;
  dispose: () => Promise<void>;
};

function connectStomp(token: string): StompConnection {
  let resolveConnected: () => void;
  let rejectConnected: (reason: unknown) => void;
  const connected = new Promise<void>((resolve, reject) => {
    resolveConnected = resolve;
    rejectConnected = reject;
  });
  // 아무도 안 기다려도(무효 토큰 경로처럼 reject 로 끝나는 경우) Node 가
  // unhandledRejection 을 띄우지 않도록 미리 하나 붙여 둔다 — race 쪽에서
  // 쓰는 별도 체인과는 무관하다.
  connected.catch(() => {});

  let resolveErrorFrame: (frame: StompFrameLike) => void;
  const errorFrame = new Promise<StompFrameLike>((resolve) => {
    resolveErrorFrame = resolve;
  });

  const client = createStompClient({
    brokerURL: WS_BASE_URL,
    connectHeaders: { Authorization: `Bearer ${token}` },
    onConnect: () => resolveConnected(),
    onStompError: (frame) => resolveErrorFrame(frame),
    onWebSocketClose: () => rejectConnected(new Error("CONNECT 이전에 WebSocket 이 닫힘")),
    onWebSocketError: (event) => rejectConnected(event),
  });
  client.activate();

  return {
    connected,
    errorFrame,
    subscribe: (destination) => {
      client.subscribe(destination, () => {});
    },
    dispose: async () => {
      try {
        await client.deactivate({ force: true });
      } catch {
        // 서버가 4403 으로 이미 닫아 둔 소켓을 다시 닫으려는 경우 등 — 정리
        // 단계의 실패는 시험 판정에 영향을 주지 않는다.
      }
    },
  };
}

// SUBSCRIBE 가 허용되면 일정 시간(3초) 안에 ERROR 프레임이 오지 않는다 —
// Dart 쪽 `onTimeout: () => '__no-forbidden__'` 과 같은 형태의 부정 확인.
async function expectSubscribeAllowed(conn: StompConnection): Promise<void> {
  const sentinel = "__no-forbidden__";
  const result = await Promise.race([
    conn.errorFrame.then((frame) => frame.headers.message ?? "__forbidden-without-message__"),
    new Promise<string>((resolve) => setTimeout(() => resolve(sentinel), 3_000)),
  ]);
  expect(result).toBe(sentinel);
}

// SUBSCRIBE 가 거부되면 ERROR 프레임의 message 헤더에 그 ErrorCode 이름이
// 실린다(`StompErrorFrameHandler`, ACADEMY_SCOPE_VIOLATION·FORBIDDEN 등).
async function expectSubscribeDenied(conn: StompConnection, expectedErrorCode: string): Promise<void> {
  const timedOut = "__timeout__";
  const result = await Promise.race([
    conn.errorFrame.then((frame) => frame.headers.message),
    new Promise<string>((resolve) => setTimeout(() => resolve(timedOut), 10_000)),
  ]);
  expect(result).toBe(expectedErrorCode);
}

describe("실백엔드 계약 — STOMP 구독 인가 경계", () => {
  // 시드(V2__seed_data.sql) 기준 — staffA(academy_id=1)·staffB(academy_id=2)
  // 는 둘 다 활성 학원 소속 관계자, sysadmin 은 플랫폼 범위(system_admin).

  it("staffA(학원 1 소속)가 자기 학원 채널을 구독하면 거부되지 않는다", async ({ skip }) => {
    if (!backendReachable) {
      skip();
    }
    const token = await rawLogin("staffA");
    const conn = connectStomp(token);
    await conn.connected;
    conn.subscribe(academyLiveDestination("1"));
    await expectSubscribeAllowed(conn);
    await conn.dispose();
  });

  it("sysadmin(플랫폼 범위)이 전체 관제 채널을 구독하면 거부되지 않는다", async ({ skip }) => {
    if (!backendReachable) {
      skip();
    }
    const token = await rawLogin("sysadmin");
    const conn = connectStomp(token);
    await conn.connected;
    conn.subscribe(adminLiveDestination());
    await expectSubscribeAllowed(conn);
    await conn.dispose();
  });

  it("staffA(학원 1 소속)가 남의 학원(학원 2) 채널을 구독하면 ACADEMY_SCOPE_VIOLATION 으로 거부된다", async ({ skip }) => {
    if (!backendReachable) {
      skip();
    }
    const token = await rawLogin("staffA");
    const conn = connectStomp(token);
    await conn.connected;
    conn.subscribe(academyLiveDestination("2"));
    await expectSubscribeDenied(conn, "ACADEMY_SCOPE_VIOLATION");
    await conn.dispose();
  });

  it("staffA(학원 관계자, 플랫폼 범위 아님)가 전체 관제 채널을 구독하면 FORBIDDEN 으로 거부된다", async ({ skip }) => {
    if (!backendReachable) {
      skip();
    }
    const token = await rawLogin("staffA");
    const conn = connectStomp(token);
    await conn.connected;
    conn.subscribe(adminLiveDestination());
    await expectSubscribeDenied(conn, "FORBIDDEN");
    await conn.dispose();
  });

  it("유효하지 않은 토큰으로 CONNECT 를 시도하면 연결이 성립하지 않는다", async ({ skip }) => {
    if (!backendReachable) {
      skip();
    }
    const conn = connectStomp("this-is-not-a-valid-jwt");
    const timedOut = "__timeout__";
    const outcome = await Promise.race([
      conn.connected.then(() => "connected" as const, () => "closed-before-connect" as const),
      conn.errorFrame.then(() => "error-frame" as const),
      new Promise<typeof timedOut>((resolve) => setTimeout(() => resolve(timedOut), 10_000)),
    ]);
    // CONNECT 인증 실패는 `IllegalArgumentException`(BusinessException 이 아님)이라
    // ERROR 프레임의 message 헤더가 특정 ErrorCode 이름으로 고정되지 않는다
    // (`StompErrorFrameHandler.errorCodeOf` 가 null 을 반환) — 그래서 여기서는
    // "연결에 성공하지 않았다"만 확인한다(어느 쪽으로 실패했는지는 셋 중 하나면 된다).
    expect(outcome).not.toBe("connected");
    await conn.dispose();
  });
});
