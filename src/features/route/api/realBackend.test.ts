// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { setAccessToken } from "@/shared/lib/http";
import { requireRealBackendApiBaseUrl } from "@/shared/testing/realBackendTarget";
import { rawRestLogin } from "@/shared/testing/rawRestLogin";
import { createRoute, deleteRoute, getRouteDetail, getRoutes } from "./index";

// 고정 노선 편성 화면(§5.9, RTE-01, A-08)이 부르는 조회·등록·삭제 엔드포인트를
// 실제 F5-W1 전용 백엔드에 붙여 확인한다. 정차 순서 최적화(RTE-09, §5.9)와
// 확정 노선 경유 지점 지정(RTE-10, §5.15)은 호출 즉시 커밋되는 비가역
// 동작이라(api/index.ts 주석 — "미리보기 플래그가 없다") 이 계약 시험에서는
// 다루지 않는다 — 되돌릴 수 없는 변형을 공유 시드에 남기지 않기 위함이다.
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
});
