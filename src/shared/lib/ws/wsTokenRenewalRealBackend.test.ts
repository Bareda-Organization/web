// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { AcademyRealtimeClient } from "./academyRealtimeClient";
import { createStompClient, type StompClientConfig, type StompClientLike } from "./stompClient";
import { academyLiveDestination } from "./wsChannel";
import type { WsConnectionState } from "./wsConnectionState";
import { requireRealBackendApiBaseUrl, requireRealBackendWsUrl } from "@/shared/testing/realBackendTarget";

// 실서버 확인(R46-LATERRT 목표 4) — 접근 토큰 수명을 짧게 띄운 서버에서 `AcademyRealtimeClient` 가 토큰 만료 전
// 갈아타기를 겪고도 방송을 계속 받는지 잰다. 서버를 이렇게 띄운다:
//   ./gradlew bootRun --args='... --jwt.access-token-validity-seconds=120'
// 토큰 수명이 150초를 넘으면 이 시험은 건너뛴다(15분짜리 토큰으로는 갈아타기까지 14분을 기다려야 한다).
//
// 시험은 두 가지를 본다 — ①사용자가 보는 것: 연결 상태가 `connected` 를 벗어나지 않고 방송 공백이 없으며 같은 방송이 두 번
// 오지 않는다 ②중복 제거의 전제: 두 연결이 같은 방송을 *같은 바이트로* 받는다(`Ruling 682`).
//
// 재발급은 웹이 쿠키로 하는 `POST /auth/refresh` 대신 로그인을 다시 부른다 — Node 에는 쿠키 보관소가 없고, 이 시험이
// 보려는 것은 "새 토큰을 받아 갈아타는 클라이언트의 동작"이지 재발급 API 가 아니다.
const API_BASE_URL = requireRealBackendApiBaseUrl();
const WS_URL = requireRealBackendWsUrl();
const MAX_TTL_SECONDS = 150;
const OBSERVE_MS = 140_000;
const MAX_GAP_MS = 5_000;

let backendReachable = false;

beforeAll(async () => {
  try {
    await fetch(`${API_BASE_URL}/academies/search?q=바래다`);
    backendReachable = true;
  } catch {
    backendReachable = false;
  }
}, 10_000);

type Login = { token: string; ttlSeconds: number };

const loginAs = async (loginId: string): Promise<Login> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
    body: JSON.stringify({ login_id: loginId, password: "password" }),
  });
  const json = (await response.json()) as { data?: { access_token?: string } };
  const token = json.data?.access_token;
  if (!response.ok || !token) throw new Error(`로그인 실패(${loginId}): ${response.status} ${JSON.stringify(json)}`);
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as { iat: number; exp: number };
  return { token, ttlSeconds: claims.exp - claims.iat };
};

describe("실서버 — 접근 토큰 만료 전 무중단 갈아타기", () => {
  it(
    "토큰 수명 120초 서버에서 갈아타기를 겪고도 상태는 connected · 방송 공백 없음 · 중복 없음",
    async ({ skip }) => {
      if (!backendReachable) skip();
      const first = await loginAs("staffA");
      if (first.ttlSeconds > MAX_TTL_SECONDS) skip();

      let token = first.token;
      const connections: { index: number; tapped: Map<string, number> }[] = [];
      const factory = (config: StompClientConfig): StompClientLike => {
        const index = connections.length;
        const tapped = new Map<string, number>();
        connections.push({ index, tapped });
        const inner = createStompClient(config);
        // 연결별로 받은 원문 본문을 센다 — 갈아타는 동안 두 연결이 같은 바이트를 받는지 보려는 관측용 래퍼.
        return {
          activate: () => inner.activate(),
          deactivate: (options) => inner.deactivate(options),
          subscribe: (destination, callback) =>
            inner.subscribe(destination, (message) => {
              tapped.set(message.body, (tapped.get(message.body) ?? 0) + 1);
              callback(message);
            }),
          get connected() {
            return inner.connected;
          },
        };
      };

      const client = new AcademyRealtimeClient({
        url: WS_URL,
        createClient: factory,
        readAccessToken: () => token,
        refreshAccessToken: async () => {
          token = (await loginAs("staffA")).token;
          return token;
        },
      });

      client.connect();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("연결 시간 초과")), 10_000);
        client.onConnectionStateChange(() => {
          if (client.getSnapshot() === "connected") {
            clearTimeout(timer);
            resolve();
          }
        });
        if (client.getSnapshot() === "connected") resolve();
      });

      // 최초 연결이 끝난 뒤부터의 상태 알림만 센다 — 갈아타는 동안 한 번도 알리지 않아야 한다.
      const states: WsConnectionState[] = [];
      client.onConnectionStateChange(() => states.push(client.getSnapshot()));
      const startedAt = Date.now();
      const arrivals: { at: number; key: string }[] = [];
      client.subscribe(academyLiveDestination("1"), (envelope) => {
        arrivals.push({ at: Date.now() - startedAt, key: `${envelope.runId}|${envelope.occurredAt}` });
      });

      await new Promise((resolve) => setTimeout(resolve, OBSERVE_MS));
      const observedStates = [...states];
      client.disconnect();

      const gaps = arrivals.slice(1).map((arrival, i) => arrival.at - arrivals[i].at);
      const maxGap = gaps.length === 0 ? Number.POSITIVE_INFINITY : Math.max(...gaps);
      const duplicates = arrivals.length - new Set(arrivals.map((arrival) => arrival.key)).size;
      const lastArrival = arrivals.length === 0 ? 0 : arrivals[arrivals.length - 1].at;
      // 두 연결이 모두 받은 본문 = 갈아타는 동안 같은 방송이 두 연결로 온 것. 방송은 묶음으로 오고 묶음 사이가 최대 2.5초 쉬어서
      // 확인 대기 1.5초 안에 방송이 하나도 안 걸릴 수 있다 — 갈아타기 두 번(연결 0↔1 · 1↔2)을 합쳐 센다.
      const sharedBodies = (a: Map<string, number>, b: Map<string, number>) => [...a.keys()].filter((body) => b.has(body)).length;
      const bodiesOnBoth = connections.slice(1).reduce((sum, next, i) => sum + sharedBodies(connections[i].tapped, next.tapped), 0);

      console.log(
        JSON.stringify({
          ttlSeconds: first.ttlSeconds,
          connections: connections.length,
          stateNotificationsDuringObservation: observedStates,
          arrivals: arrivals.length,
          maxGapMs: maxGap,
          duplicatesDelivered: duplicates,
          lastArrivalMs: lastArrival,
          bodiesReceivedOnBothConnectionsAcrossSwaps: bodiesOnBoth,
        }),
      );

      // 토큰 수명 120초 · 관측 140초 — 60초째와 120초째 두 번 갈아탄다(연결 3개).
      expect(connections.length).toBeGreaterThanOrEqual(2);
      expect(observedStates).toEqual([]);
      expect(maxGap).toBeLessThan(MAX_GAP_MS);
      expect(lastArrival).toBeGreaterThan(first.ttlSeconds * 1000 + 5_000);
      expect(duplicates).toBe(0);
      expect(bodiesOnBoth).toBeGreaterThan(0);
    },
    OBSERVE_MS + 60_000,
  );
});
