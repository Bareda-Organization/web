// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { createRoute, deleteRoute, getRouteDetail, getRoutes, optimizeRoute, updateRoute } from "./index";

// 고정 노선 편성 화면(§5.9, RTE-01, A-08)이 부르는 조회·등록·수정·삭제·최적화
// 엔드포인트를 실제 F5-W1 전용 백엔드에 붙여 확인한다.
//
// updateRoute(RTE-01)·optimizeRoute(RTE-09)는 시드 노선(route_id=1·2)이 아니라
// 이 시험이 스스로 만들고 지우는 전용 노선 위에서만 실행한다 — optimizeRoute 는
// 미리보기 플래그가 없어 호출 즉시 정차 순서를 커밋하는 비가역 동작이고(api/index.ts
// 주석), 전용 노선이면 그 커밋이 삭제와 함께 사라져 안전하다.
//
// 확정 노선 경유 지점 지정(RTE-10, addRunWaypoint·removeRunWaypoint, §5.15)은
// 여기서 다루지 않는다 — optimizeRoute 와 이유가 다르다(비가역이라서가 아니라
// 시드에 대상 회차가 없어서). `WaypointCommandService.routeContextOf` 가 요구하는
// 두 조건(①academy·bus·weekday·direction 이 일치하는 고정 route ②그 run 에 이미
// confirmed_route 가 존재)을 동시에 만족하는 run 은 시드 전체에서 run_id=2 하나뿐인데,
// 그 run 은 approval 계약 시험(approval_id=1)의 지문(fingerprint) 안정성이 걸려 있어
// 건드릴 수 없다(approval/api/realBackend.test.ts 주석). 나머지 run 은 전부 두 조건
// 중 하나 이상이 깨진다 — R1·R6(idle, confirmed_route 없음) · R3(bus_id=2, 일치하는
// route 없음) · R5(academy2/bus3, 일치하는 route 없음) · R7(tomorrow 라 weekday 가
// 시드 route 와 안 맞음). 스케줄러가 R1·R6 을 confirmed 로 넘길 때까지 기다리는 것
// 외에 안전하게 실측할 방법이 없어 이번 라운드는 조사만 남기고 시험은 보류한다
// (보고서 §2).
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
    expect(created.id).toBeGreaterThan(0);

    await deleteRoute(created.id);

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
      stopIds: [1, 2, 3],
    });

    try {
      const optimized = await optimizeRoute(created.id, {
        origin: { lat: 37.497942, lng: 127.027621 }, // academy_id=1 좌표
        destination: { lat: 37.5695, lng: 126.981 }, // stop_id=4 좌표
      });

      expect(optimized.id).toBe(created.id);
      expect(optimized.stops.length).toBe(3);
      expect(optimized.stops.map((s) => s.stopId).sort()).toEqual([1, 2, 3]);
    } finally {
      await deleteRoute(created.id);
    }
  });
});
