// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import {
  addRunWaypoint,
  createRoute,
  deleteRoute,
  getRouteDetail,
  getRoutes,
  optimizeRoute,
  removeRunWaypoint,
  updateRoute,
} from "./index";

// 고정 노선 편성 화면(§5.9, RTE-01, A-08)이 부르는 조회·등록·수정·삭제·최적화
// 엔드포인트를 실제 F5-W1 전용 백엔드에 붙여 확인한다.
//
// updateRoute(RTE-01)·optimizeRoute(RTE-09)는 시드 노선(route_id=1·2)이 아니라
// 이 시험이 스스로 만들고 지우는 전용 노선 위에서만 실행한다 — optimizeRoute 는
// 미리보기 플래그가 없어 호출 즉시 정차 순서를 커밋하는 비가역 동작이고(api/index.ts
// 주석), 전용 노선이면 그 커밋이 삭제와 함께 사라져 안전하다.
//
// 확정 노선 경유 지점 지정(RTE-10, addRunWaypoint·removeRunWaypoint, §5.15) — R14-T3 전용
// 회차(R8, V2__seed_data.sql)를 두어 실제로 돈다. R12 이월은 "재료가 없다" 로만 적었으나
// 실측(curl, 보고서 §1)해 보니 진짜 막던 것은 재료 부재가 아니라 프런트 응답 변환 버그였다
// — stops_before·after 는 stop_id·lat·lng 가 없는 축약형(seq·stop_name·eta)인데 기존
// toWaypointResult 가 RouteStop(RTE-01 용, stop_id·name·lat·lng)으로 잘못 매핑했다(types/index.ts
// ·api/index.ts 정정). R8 은 route id=1(1호차·to_academy)과 academy·bus·weekday·direction 이
// 일치하고 confirmed_route 를 갖는 전용 회차라 R2(approval 계약 시험의 지문 안정성이 걸려 있다)를
// 건드리지 않는다.
//
// 두 계약 검사 모두 실제 네이버 Directions API 를 부른다(WaypointCommandService 클래스
// javadoc). 한 시험 안에서 짧게 이어 부르면(이 파일이 이미 optimizeRoute 로 1회 부른 뒤라
// 통틀어 3~4회째) 드물게 개별 호출이 실패하고, 그 실패가 `mapRoute` 서킷(resilience4j,
// sliding-window=10·최소표본=5·임계 50%)의 재시도 3회와 겹쳐 열림으로 넘어가
// `MAP_ROUTE_UNAVAILABLE`(503)로 확정된다 — R14-T3 실측(보고서 §2, 인프라성 불안정으로
// 분류, 코드 결함 아님). 즉시 재시도(예: vitest `retry`)는 같은 요청을 같은 순간에 한 번 더
// 두드릴 뿐이라 열린 서킷 앞에서 무력하다 — 아래 `retryOnMapRouteUnavailable` 로 서킷의
// `wait-duration-in-open-state`(10s)보다 긴 실제 지연을 두고 재시도한다.
const MAP_ROUTE_RETRY_DELAY_MS = 11_000;

async function retryOnMapRouteUnavailable<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    if (!(cause instanceof ApiError) || cause.code !== "MAP_ROUTE_UNAVAILABLE") {
      throw cause;
    }
    await new Promise((resolve) => setTimeout(resolve, MAP_ROUTE_RETRY_DELAY_MS));
    return fn();
  }
}
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

describe("route api — 실서버 계약", () => {
  // 시드(F5-W1 전용 DB) 기준 — staffA(academy_id=1) 소속 노선 1개(route_id=1, 1호차·mon·to_academy).

  it("getRoutes 는 staffA 학원의 노선 목록을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getRoutes(0);

    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("getRouteDetail 은 route_id=1 의 정차 순서를 seq 차례로 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const result = await getRouteDetail(1);

    expect(result.id).toBe(1);
    expect(Array.isArray(result.stops)).toBe(true);
    expect(result.stops.length).toBeGreaterThan(0);
  });

  // 등록→삭제를 한 시험 안에서 마쳐 시드를 원상태로 되돌린다(2026-09-14 curl 로
  // 먼저 확인한 안전한 자체 정리 경로).
  it("createRoute 로 등록한 노선을 deleteRoute 로 지우면 목록에서 사라진다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const created = await createRoute({
      busId: 2,
      weekday: "wed",
      direction: "to_academy",
      name: "실서버계약시험용",
      active: true,
    });
    try {
      expect(created.id).toBeGreaterThan(0);
    } finally {
      await deleteRoute(created.id);
    }

    const afterDelete = await getRoutes(0);
    expect(afterDelete.items.some((r) => r.id === created.id)).toBe(false);
  });

  // updateRoute(RTE-01) — 전용 노선을 만들어 이름·정차 순서를 고치고 지운다.
  // 시드 노선(route_id=1·2)은 건드리지 않는다.
  it("updateRoute 는 전용 노선의 이름과 정차 순서를 바꾼 응답을 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const created = await createRoute({
      busId: 2,
      weekday: "wed",
      direction: "to_academy",
      name: "실서버계약시험용-수정전",
      active: true,
      stopIds: [1, 2],
    });

    try {
      const updated = await updateRoute(created.id, {
        name: "실서버계약시험용-수정후",
        stopIds: [2, 1],
      });

      expect(updated.name).toBe("실서버계약시험용-수정후");
      expect(updated.stops.map((s) => s.stopId)).toEqual([2, 1]);
    } finally {
      await deleteRoute(created.id);
    }
  });

  // optimizeRoute(RTE-09) — 전용 노선 위에서만 호출한다(비가역, 호출 즉시 커밋).
  it("optimizeRoute 는 전용 노선의 정차 순서를 재계산해 돌려준다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    const created = await createRoute({
      busId: 2,
      weekday: "wed",
      direction: "to_academy",
      name: "실서버계약시험용-최적화",
      active: true,
      stopIds: [3, 1, 2], // 일부러 뒤섞은 순서 — 최적화가 실제로 다시 정렬하는지 판별하려면
      // 입력이 이미 최적 순서면 안 바뀌어도 통과해 버려 구별이 안 된다.
    });

    try {
      const optimized = await optimizeRoute(created.id, {
        origin: { lat: 37.497942, lng: 127.027621 }, // academy_id=1 좌표
        destination: { lat: 37.5695, lng: 126.981 }, // stop_id=4 좌표
      });
      const orderedIds = optimized.stops.map((s) => s.stopId);

      expect(optimized.id).toBe(created.id);
      expect(orderedIds.length).toBe(3);
      expect([...orderedIds].sort()).toEqual([1, 2, 3]);
      // 입력 그대로면 엔진을 통과하지 않고 되돌려준 것과 구별이 안 된다 — 실제로 재정렬됐는지 확인.
      expect(orderedIds).not.toEqual([3, 1, 2]);
    } finally {
      await deleteRoute(created.id);
    }
  });

  // addRunWaypoint(RTE-10) — 미리보기(apply=false)는 확정 노선을 바꾸지 않는다. R8 명단(학생
  // 2명, run_stop 2건)에 새 경유 지점 하나를 더하면 "후" 정차가 1곳 늘어야 한다.
  it(
    "addRunWaypoint 는 apply=false 면 미리보기만 계산하고 확정 노선을 바꾸지 않는다",
    async ({ skip }) => {
      if (!backendReachable) skip();
      setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

      const result = await retryOnMapRouteUnavailable(() =>
        addRunWaypoint(8, { label: "실서버계약시험-경유지", lat: 37.573, lng: 126.981, apply: false }),
      );

      expect(result.waypointId).toBeGreaterThan(0);
      expect(result.applied).toBe(false);
      expect(result.routePreview.stopsBefore.length).toBe(2);
      expect(result.routePreview.stopsAfter.length).toBe(3);
    },
    MAP_ROUTE_RETRY_DELAY_MS + 10_000,
  );

  // addRunWaypoint→removeRunWaypoint(RTE-10) — apply=true 로 배포하면 확정 노선이 바뀌고
  // (정차 3곳), 같은 경유 지점을 apply=true 로 제거하면 원래 정차 수(2곳)로 되돌아간다 —
  // R8 을 다음 실행에도 같은 상태로 남겨 반복 실행이 가능하다.
  it(
    "addRunWaypoint 로 배포한 경유 지점을 removeRunWaypoint 로 제거하면 원래 정차 수로 돌아간다",
    async ({ skip }) => {
      if (!backendReachable) skip();
      setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

      const added = await retryOnMapRouteUnavailable(() =>
        addRunWaypoint(8, { label: "실서버계약시험-경유지-배포", lat: 37.573, lng: 126.981, apply: true }),
      );
      // 이 시점부터는 반드시 되돌린다 — remove 호출이 단언에 닿기 전에 던지면(위 503 류) R8 이
      // 3정차 상태로 남아 다음 실행의 "전 2곳" 전제를 깨뜨린다.
      let removedOk = false;
      try {
        expect(added.applied).toBe(true);
        expect(added.routePreview.stopsAfter.length).toBe(3);

        const removed = await retryOnMapRouteUnavailable(() => removeRunWaypoint(8, added.waypointId, true));
        removedOk = true;

        expect(removed.applied).toBe(true);
        expect(removed.routePreview.stopsAfter.length).toBe(2);
      } finally {
        if (!removedOk) {
          await removeRunWaypoint(8, added.waypointId, true).catch(() => {});
        }
      }
    },
    2 * MAP_ROUTE_RETRY_DELAY_MS + 10_000,
  );
});
