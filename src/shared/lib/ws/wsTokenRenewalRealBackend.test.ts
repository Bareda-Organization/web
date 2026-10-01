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
// ⚠ 전제 — 학원 1 에 **운행 중(moving) 회차가 있는 서버**여야 한다. `local` 프로파일 `DemoRunSimulator` 가 기동 15초 뒤부터
// 데모 선단(V13 · 기사 `driverD3`~`D5`) 회차를 출발시켜 위치를 방송하므로, 기본 `bootRun` 이면 갖춰진다.
// `--app.demo.enabled=false` 로 띄우거나 자정을 넘겨(시뮬레이터는 오늘 날짜 회차만 움직인다) 서버를 재기동하지 않았으면
// 운행 중 회차가 없어, 30초 기다린 뒤 그 원인을 말하며 실패한다(예전에는 방송 0건 → 공백 `Infinity` 로 140초 뒤 실패했다).
// 30초를 기다리는 이유 — 시험 실행 첫머리의 `POST /dev/reset`(`vitest.globalSetup.ts`)이 회차를 전부 `idle` 로 되돌려
// 시뮬레이터가 다시 출발시킬 때까지 몇 초 걸린다.
//
// 시험은 두 가지를 본다 — ①사용자가 보는 것: 연결 상태가 `connected` 를 벗어나지 않고 방송 공백이 없으며 같은 방송이 두 번
// 오지 않는다 ②중복 제거의 전제: 두 연결이 같은 방송을 *같은 바이트로* 받는다(`Ruling 682`).
//
// ②는 방송이 갈아타는 순간에 걸려야 보인다. 시뮬레이터 방송은 2초 틱 묶음이라 묶음 사이가 최대 2.5초인데 갈아타기의 확인 대기는
// 1.5초라 두 번 다 비껴 갈 수 있었다(타이밍 운 — 첫 실행 0건 실패 · 같은 명령 재실행 통과). 그래서 **시험이 방송을 스스로 일으킨다**:
// 그 운행 중 회차의 기사로 로그인해 그 회차의 현재 위치를 0.4초마다 다시 올린다(`POST /runs/{id}/position` · 같은 좌표라 새 상태·
// 알림을 만들지 않는다). 클라이언트의 확인 대기·닫는 시점은 그대로 둔다 — 늘리면 "1.5초면 새 연결이 이미 방송을 받는다" 는
// 검사까지 약해진다.
//
// 재발급은 웹이 쿠키로 하는 `POST /auth/refresh` 대신 로그인을 다시 부른다 — Node 에는 쿠키 보관소가 없고, 이 시험이
// 보려는 것은 "새 토큰을 받아 갈아타는 클라이언트의 동작"이지 재발급 API 가 아니다.
const API_BASE_URL = requireRealBackendApiBaseUrl();
const WS_URL = requireRealBackendWsUrl();
const MAX_TTL_SECONDS = 150;
const OBSERVE_MS = 140_000;
const MAX_GAP_MS = 5_000;
// 시험이 스스로 올리는 위치의 주기 — 확인 대기(1.5초) 안에 방송이 여러 건 걸리게 촘촘히.
const OWN_BROADCAST_EVERY_MS = 400;
// 기사 토큰은 120초 수명이라 중간에 다시 로그인한다.
const DRIVER_RELOGIN_MS = 60_000;
// 운행 중 회차가 나타날 때까지 기다리는 한도와 간격.
const TARGET_WAIT_MS = 30_000;
const TARGET_POLL_MS = 2_000;
// 데모 선단(V13) 기사 — 각자 `GET /manager/runs` 로 자기 운행 중 회차를 찾는다.
const DEMO_DRIVERS = ["driverD3", "driverD4", "driverD5"];

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

type OwnBroadcastTarget = { driverLoginId: string; runId: string; lat: number; lng: number };

const getData = async <T>(path: string, token: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`${path} → ${response.status}`);
  return ((await response.json()) as { data: T }).data;
};

// 운행 중 회차를 맡은 데모 기사와 그 회차의 현재 위치(관제 스냅샷). 없으면 null.
const findOwnBroadcastTarget = async (staffToken: string): Promise<OwnBroadcastTarget | null> => {
  const live = await getData<{ runs: { run_id: string; position: { lat: number; lng: number } | null }[] }>(
    "/staff/runs/live",
    staffToken,
  );
  for (const driverLoginId of DEMO_DRIVERS) {
    const { token } = await loginAs(driverLoginId);
    const mine = await getData<{ items: { run_id: string; run_status: string }[] }>("/manager/runs", token);
    const moving = mine.items.find((item) => item.run_status === "moving");
    const position = live.runs.find((run) => run.run_id === moving?.run_id)?.position;
    if (moving && position) return { driverLoginId, runId: moving.run_id, lat: position.lat, lng: position.lng };
  }
  return null;
};

const waitForOwnBroadcastTarget = async (staffToken: string): Promise<OwnBroadcastTarget | null> => {
  const deadline = Date.now() + TARGET_WAIT_MS;
  for (;;) {
    const target = await findOwnBroadcastTarget(staffToken);
    if (target !== null || Date.now() > deadline) return target;
    await new Promise((resolve) => setTimeout(resolve, TARGET_POLL_MS));
  }
};

// 그 회차의 현재 위치를 주기적으로 다시 올린다. 반환값은 멈추는 함수 — 성공·실패 건수를 돌려준다.
const startOwnBroadcasts = (target: OwnBroadcastTarget) => {
  let stopped = false;
  let token = "";
  let loggedInAt = 0;
  const outcome = { posted: 0, failed: 0 };
  const loop = (async () => {
    while (!stopped) {
      try {
        if (token === "" || Date.now() - loggedInAt > DRIVER_RELOGIN_MS) {
          token = (await loginAs(target.driverLoginId)).token;
          loggedInAt = Date.now();
        }
        const response = await fetch(`${API_BASE_URL}/runs/${target.runId}/position`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat: target.lat, lng: target.lng, recorded_at: new Date().toISOString() }),
        });
        if (response.ok) outcome.posted += 1;
        else outcome.failed += 1;
      } catch {
        outcome.failed += 1;
      }
      await new Promise((resolve) => setTimeout(resolve, OWN_BROADCAST_EVERY_MS));
    }
  })();
  return async () => {
    stopped = true;
    await loop;
    return outcome;
  };
};

describe("실서버 — 접근 토큰 만료 전 무중단 갈아타기", () => {
  it(
    "토큰 수명 120초 서버에서 갈아타기를 겪고도 상태는 connected · 방송 공백 없음 · 중복 없음",
    async ({ skip }) => {
      if (!backendReachable) skip();
      const first = await loginAs("staffA");
      if (first.ttlSeconds > MAX_TTL_SECONDS) skip();
      const target = await waitForOwnBroadcastTarget(first.token);
      if (target === null) {
        throw new Error(
          "30초 기다려도 학원 1 에 운행 중(moving) 회차를 맡은 데모 기사(driverD3~D5)가 없다 — 이 시험은 local 프로파일 DemoRunSimulator 가 " +
            "켜진 서버(app.demo.enabled=true · 기동 15초 뒤 · 자정을 넘겼으면 재기동)에서만 성립한다.",
        );
      }

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

      const stopOwnBroadcasts = startOwnBroadcasts(target);
      await new Promise((resolve) => setTimeout(resolve, OBSERVE_MS));
      const ownBroadcasts = await stopOwnBroadcasts();
      const observedStates = [...states];
      client.disconnect();

      const gaps = arrivals.slice(1).map((arrival, i) => arrival.at - arrivals[i].at);
      const maxGap = gaps.length === 0 ? Number.POSITIVE_INFINITY : Math.max(...gaps);
      const duplicates = arrivals.length - new Set(arrivals.map((arrival) => arrival.key)).size;
      const lastArrival = arrivals.length === 0 ? 0 : arrivals[arrivals.length - 1].at;
      // 두 연결이 모두 받은 본문 = 갈아타는 동안 같은 방송이 두 연결로 온 것. 갈아타기 두 번(연결 0↔1 · 1↔2)을 합쳐 센다.
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
          ownPositionPosts: ownBroadcasts,
        }),
      );

      // 토큰 수명 120초 · 관측 140초 — 60초째와 120초째 두 번 갈아탄다(연결 3개).
      expect(connections.length).toBeGreaterThanOrEqual(2);
      expect(observedStates).toEqual([]);
      expect(maxGap).toBeLessThan(MAX_GAP_MS);
      expect(lastArrival).toBeGreaterThan(first.ttlSeconds * 1000 + 5_000);
      expect(duplicates).toBe(0);
      // 시험이 0.4초마다 방송을 일으키므로 확인 대기 1.5초 안에는 반드시 걸린다 — 0 이면 운이 아니라 두 연결이 같은 바이트를
      // 받지 못한 것이거나(서버), 시험의 위치 올리기가 실패한 것이다(아래 건수로 가른다).
      expect(bodiesOnBoth, `시험의 위치 올리기 성공 ${ownBroadcasts.posted}건 · 실패 ${ownBroadcasts.failed}건`).toBeGreaterThan(0);
    },
    OBSERVE_MS + 60_000,
  );
});
