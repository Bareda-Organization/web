// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { ApiError, setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import {
  createRoute,
  deleteRoute,
  getRouteDetail,
  getRoutes,
  optimizeRoute,
  saveRouteStops,
  suggestStops,
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
// 확정 노선 경유 지점(RTE-10)의 계약 검사는 2026-09-23 편성 화면에서 그 기능을 뺄 때 함께 뺐다 —
// 웹이 그 엔드포인트를 더는 부르지 않는다(백엔드 자체 검사는 남아 있다).
//
// 최적화 계약 검사는 실제 네이버 Directions API 를 부를 수 있다. 한 시험 안에서 짧게 이어 부르면(이 파일이 이미 optimizeRoute 로 1회 부른 뒤라
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

    const result = await getRouteDetail("1");

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
      busId: "2",
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
      busId: "2",
      weekday: "wed",
      direction: "to_academy",
      name: "실서버계약시험용-수정전",
      active: true,
      stopIds: ["1", "2"],
    });

    try {
      const updated = await updateRoute(created.id, {
        name: "실서버계약시험용-수정후",
        stopIds: ["2", "1"],
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
      busId: "2",
      weekday: "wed",
      direction: "to_academy",
      name: "실서버계약시험용-최적화",
      active: true,
      stopIds: ["3", "1", "2"], // 일부러 뒤섞은 순서 — 최적화가 실제로 다시 정렬하는지 판별하려면
      // 입력이 이미 최적 순서면 안 바뀌어도 통과해 버려 구별이 안 된다.
    });

    try {
      // 기준점을 보내지 않는다 — 서버가 방향 규칙으로 정한다(2026-09-23).
      const optimized = await retryOnMapRouteUnavailable(() => optimizeRoute(created.id));
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

  // 2026-09-23 — 저장 한 번에 수정·추가·순서가 반영된다. 전용 노선 위에서만(비가역).
  // 수정 대상은 이 시험이 새로 만든 승하차지다 — 시드 승하차지를 고치면 다른 노선·학생 주소가 따라 바뀐다.
  it("saveRouteStops 는 새 승하차지를 만들고 순서·이름 수정까지 한 번에 반영한다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));
    const created = await createRoute({
      busId: "2", weekday: "thu", direction: "to_academy", name: "실서버계약시험용-저장", active: true, stopIds: ["1"],
    });

    try {
      // 시드 승하차지 1번은 목록에서 빼기만 한다(좌표를 보내 옮기지 않는다). 새 항목은 매 실행 같은 자리라
      // 두 번째 실행부터는 50m 병합으로 지난번 승하차지를 다시 쓴다 — 그래서 첫 저장의 이름은 보지 않는다.
      const added = await saveRouteStops(created.id, [{ name: "계약시험 새 승하차지", lat: 37.402, lng: 126.402 }]);
      expect(added.stops).toHaveLength(1);
      const newStop = added.stops[0];

      const saved = await saveRouteStops(created.id, [
        { stopId: newStop.stopId, name: "계약시험 이름 바꿈", lat: newStop.lat, lng: newStop.lng },
      ]);

      expect(saved.stops.map((stop) => [stop.stopId, stop.name])).toEqual([[newStop.stopId, "계약시험 이름 바꿈"]]);
    } finally {
      await deleteRoute(created.id);
    }
  });

  it("suggestStops 는 후보 목록을 돌려주고 후보가 없으면 빈 목록이다", async ({ skip }) => {
    if (!backendReachable) skip();
    setAccessToken(await rawRestLogin(API_BASE_URL, "staffA"));

    expect(Array.isArray(await suggestStops("서울특별시 양천구 목동"))).toBe(true);
    expect(await suggestStops("ㅁㄴㅇㄹ없는주소")).toEqual([]);
  });
});
