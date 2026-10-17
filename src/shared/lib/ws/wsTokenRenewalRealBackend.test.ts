// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import { AcademyRealtimeClient } from "./academyRealtimeClient";
import { createStompClient, type StompClientConfig, type StompClientLike } from "./stompClient";
import { academyLiveDestination } from "./wsChannel";
import type { WsConnectionState } from "./wsConnectionState";
import { requireRealBackendApiBaseUrl, requireRealBackendWsUrl } from "@/shared/testing/realBackendTarget";

// 실서버 확인(`Ruling 901`) — 접근 토큰 수명을 짧게 띄운 서버에서 `AcademyRealtimeClient` 가 만료 60초 전에 재발급하고 연결 하나를 닫았다
// 새 토큰으로 다시 여는 흐름을 겪고도 방송을 계속 받는지 잰다. 서버를 이렇게 띄운다:
//   ./gradlew bootRun --args='... --jwt.access-token-validity-seconds=120'
// 토큰 수명이 150초를 넘으면 이 시험은 건너뛴다(15분짜리 토큰으로는 갱신까지 14분을 기다려야 한다).
//
// ⚠ 전제 — 학원 1 에 **운행 중(moving) 회차가 있는 서버**여야 한다. `local` 프로파일 `DemoRunSimulator` 가 기동 15초 뒤부터
// 데모 선단(V13 · 기사 `driverD3`~`D5`) 회차를 출발시켜 위치를 방송하므로, 기본 `bootRun` 이면 갖춰진다.
// `--app.demo.enabled=false` 로 띄우거나 자정을 넘겨(시뮬레이터는 오늘 날짜 회차만 움직인다) 서버를 재기동하지 않았으면
// 운행 중 회차가 없어, 30초 기다린 뒤 그 원인을 말하며 실패한다.
// 30초를 기다리는 이유 — 시험 실행 첫머리의 `POST /dev/reset`(`vitest.globalSetup.ts`)이 회차를 전부 `idle` 로 되돌려
// 시뮬레이터가 다시 출발시킬 때까지 몇 초 걸린다.
//
// 시험은 세 가지를 본다 — ①연결은 언제나 1개다(STOMP 클라이언트를 한 번만 만든다) ②갱신하는 동안 연결 상태는 `connected` 를 벗어나지 않는다
// (재접속 안내를 띄우지 않는다) ③갱신으로 다시 접속할 때마다 접속 세대 번호가 오르고, 호출부가 구독을 새로 걸면(`useRealtimeChannel` 과
// 같은 동작) 방송이 이어지며 같은 방송이 두 번 오지 않는다. 다시 접속하는 사이 놓친 방송은 화면이 REST 로 한 번 메우므로(`API_SPEC §7.2`)
// 공백은 재접속에 걸린 시간만큼 허용한다.
//
// 방송 공백은 방송이 있어야 잰다. 시뮬레이터 방송은 2초 틱 묶음이라 그것만으로는 공백 측정이 거칠어, **시험이 방송을 스스로 일으킨다**:
// 그 운행 중 회차의 기사로 로그인해 그 회차의 현재 위치를 0.4초마다 다시 올린다(`POST /runs/{id}/position` · 같은 좌표라 새 상태·
// 알림을 만들지 않는다).
//
// 재발급은 웹이 쿠키로 하는 `POST /auth/refresh` 대신 로그인을 다시 부른다 — Node 에는 쿠키 보관소가 없고, 이 시험이
// 보려는 것은 "새 토큰을 받아 연결을 다시 여는 클라이언트의 동작"이지 재발급 API 가 아니다.
const API_BASE_URL = requireRealBackendApiBaseUrl();
const WS_URL = requireRealBackendWsUrl();
const MAX_TTL_SECONDS = 150;
const OBSERVE_MS = 140_000;
// 연결을 닫고 다시 여는 동안의 공백 상한 — 재접속 한 번(서버 핸드셰이크 + 구독)에 걸리는 시간.
const MAX_GAP_MS = 5_000;
// 시험이 스스로 올리는 위치의 주기 — 공백을 촘촘히 재려는 값.
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

describe("실서버 — 접근 토큰 만료 전 재발급 뒤 연결 하나를 닫고 다시 열기", () => {
  it(
    "토큰 수명 120초 서버에서 갱신을 겪고도 연결은 1개 · 상태는 connected 를 벗어나지 않음 · 구독을 새로 걸면 방송이 이어지고 중복 없음",
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
      let clientsCreated = 0;
      const factory = (config: StompClientConfig): StompClientLike => {
        clientsCreated += 1;
        return createStompClient(config);
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

      const startedAt = Date.now();
      const arrivals: { at: number; key: string }[] = [];
      let unsubscribe: (() => void) | null = null;
      // `useRealtimeChannel` 와 같은 동작 — 접속 세대 번호가 바뀔 때마다(첫 접속 · 갱신 · 끊김 뒤 재접속) 구독을 새로 건다.
      const statesAfterFirstConnected: WsConnectionState[] = [];
      let epochSeen = -1;
      let renewalsObserved = 0;
      const subscribeNow = () => {
        unsubscribe?.();
        unsubscribe = client.subscribe(academyLiveDestination("1"), (envelope) => {
          arrivals.push({ at: Date.now() - startedAt, key: `${envelope.runId}|${envelope.occurredAt}` });
        });
      };
      const firstConnected = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("연결 시간 초과")), 10_000);
        client.onConnectionStateChange(() => {
          const state = client.getSnapshot();
          const isFirstConnection = epochSeen === -1;
          if (!isFirstConnection) statesAfterFirstConnected.push(state);
          if (state !== "connected" || client.getEpoch() === epochSeen) return;
          if (!isFirstConnection) renewalsObserved += 1;
          epochSeen = client.getEpoch();
          subscribeNow();
          clearTimeout(timer);
          resolve();
        });
      });
      client.connect();
      await firstConnected;

      const stopOwnBroadcasts = startOwnBroadcasts(target);
      await new Promise((resolve) => setTimeout(resolve, OBSERVE_MS));
      const ownBroadcasts = await stopOwnBroadcasts();
      const observedStates = [...statesAfterFirstConnected];
      client.disconnect();

      const gaps = arrivals.slice(1).map((arrival, i) => arrival.at - arrivals[i].at);
      const maxGap = gaps.length === 0 ? Number.POSITIVE_INFINITY : Math.max(...gaps);
      const duplicates = arrivals.length - new Set(arrivals.map((arrival) => arrival.key)).size;
      const lastArrival = arrivals.length === 0 ? 0 : arrivals[arrivals.length - 1].at;

      console.log(
        JSON.stringify({
          ttlSeconds: first.ttlSeconds,
          clientsCreated,
          statesAfterFirstConnected: observedStates,
          renewalsObserved,
          arrivals: arrivals.length,
          maxGapMs: maxGap,
          duplicatesDelivered: duplicates,
          lastArrivalMs: lastArrival,
          ownPositionPosts: ownBroadcasts,
        }),
      );

      // 토큰 수명 120초 · 관측 140초 — 60초째와 새 토큰 수명이 같다면 120초째, 두 번 닫고 다시 연다.
      expect(clientsCreated).toBe(1);
      expect(renewalsObserved).toBeGreaterThanOrEqual(1);
      expect(observedStates.every((state) => state === "connected")).toBe(true);
      expect(maxGap).toBeLessThan(MAX_GAP_MS);
      expect(lastArrival).toBeGreaterThan(first.ttlSeconds * 1000 + 5_000);
      expect(duplicates, `시험의 위치 올리기 성공 ${ownBroadcasts.posted}건 · 실패 ${ownBroadcasts.failed}건`).toBe(0);
    },
    OBSERVE_MS + 60_000,
  );
});
