import { afterEach, describe, expect, it, vi } from "vitest";
import { addRunWaypoint, getRouteDetail, getRoutes, getRunRoute } from "./index";

// §5.9 RTE-01·09 · §5.15 RTE-10 — snake_case ↔ camelCase 변환 경계. toListItem 의
// name 필드와 toStop 의 name 필드는 서로 다른 raw 타입(노선 이름 vs 정차지 이름)이지만
// 같은 문자열 형태(`name: raw.name,`)라 두 테스트가 실제로 다른 변환 함수를 검사하는지
// 대조할 수 있다(student/api 에서 쓴 것과 같은 기법).
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("route api — snake_case ↔ camelCase 변환", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getRoutes 는 목록 항목 필드를 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            items: [
              { id: 1, bus_id: 3, bus_no: "1호차", weekday: "mon", direction: "to_academy", name: "1반 등원", active: true },
            ],
            page: 0,
            size: 20,
            total_count: 1,
            has_next: false,
          },
        }),
      ),
    );

    const result = await getRoutes(0, 20);

    expect(result.items).toEqual([
      { id: 1, busId: 3, busNo: "1호차", weekday: "mon", direction: "to_academy", name: "1반 등원", active: true },
    ]);
    expect(result.totalCount).toBe(1);
    expect(result.hasNext).toBe(false);
  });

  it("getRouteDetail 은 stops 배열까지 seq 순서대로 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            id: 1,
            bus_id: 3,
            bus_no: "1호차",
            weekday: "mon",
            direction: "to_academy",
            name: "1반 등원",
            active: true,
            stops: [{ stop_id: 10, seq: 1, name: "정문", lat: 37.1, lng: 127.1 }],
          },
        }),
      ),
    );

    const result = await getRouteDetail(1);

    expect(result.stops).toEqual([{ stopId: 10, seq: 1, name: "정문", lat: 37.1, lng: 127.1 }]);
    expect(result.busNo).toBe("1호차");
  });

  // R14-T3 실측(curl, 보고서 §1) 대로 고친 형태 — stops_before·After 는 stop_id·lat·lng 가
  // 없는 축약형(seq·stop_name·eta), reordered·removed 는 stop_id·stop_name 만 있는 참조형이다
  // (PreviewStopResponse.java·StopRefResponse.java 확인). 옛 시험은 이 두 모양을 RouteStop 하나로
  // 오인해 만든 값이라 실제 서버 응답과 달랐다.
  it("addRunWaypoint 는 routePreview 의 stopsBefore·After·reordered·removed 를 각각 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            waypoint_id: 5,
            route_preview: {
              stops_before: [{ seq: 1, stop_name: "정문", eta: null }],
              stops_after: [{ seq: 1, stop_name: "정문", eta: "2026-09-19T04:36:01.446625Z" }],
              reordered: [{ stop_id: 99, stop_name: "새 경유지" }],
              removed: [],
              road_path_before: [{ lat: 37.1, lng: 127.1 }],
              road_path_after: [{ lat: 37.1, lng: 127.1 }, { lat: 37.2, lng: 127.2 }],
            },
            est_time_before: null,
            est_time_after: "2026-09-19T04:37:55.446625Z",
            est_distance_before: null,
            est_distance_after: 6.0,
            est_duration_before: null,
            est_duration_after: 12,
            applied: false,
          },
        }),
      ),
    );

    const result = await addRunWaypoint(7, { label: "새 경유지", lat: 37.2, lng: 127.2, apply: false });

    expect(result.waypointId).toBe(5);
    expect(result.routePreview.stopsAfter).toEqual([
      { seq: 1, stopName: "정문", eta: "2026-09-19T04:36:01.446625Z" },
    ]);
    expect(result.routePreview.reordered).toEqual([{ stopId: 99, stopName: "새 경유지" }]);
    expect(result.routePreview.removed).toEqual([]);
    // `R18-C2` 목표 1·3 — §5.5 에서 밟은 함정(before/after 를 바꿔치기해도 "둘 다 비어있지 않다"만
    // 보면 통과)을 여기서도 피한다: 실제 좌표·분 값을 정확히 대조한다(개수만 세지 않는다).
    expect(result.routePreview.roadPathBefore).toEqual([{ lat: 37.1, lng: 127.1 }]);
    expect(result.routePreview.roadPathAfter).toEqual([
      { lat: 37.1, lng: 127.1 },
      { lat: 37.2, lng: 127.2 },
    ]);
    expect(result.estDurationBefore).toBeNull();
    expect(result.estDurationAfter).toBe(12);
    expect(result.applied).toBe(false);
  });

  // R15-T2 목표 4 — road_path 좌표 배열과 fallback_used 를 camelCase 로 바꾼다. 좌표
  // 순서가 뒤집히면(경도·위도 자리 교환) 지도가 바다 위로 가므로 첫·끝 값을 각각 본다.
  it("getRunRoute 는 road_path·fallback_used 를 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            road_path: [
              { lat: 37.1, lng: 127.1 },
              { lat: 37.2, lng: 127.2 },
            ],
            fallback_used: false,
            stops: [],
          },
        }),
      ),
    );

    const result = await getRunRoute(7);

    expect(result.roadPath).toEqual([
      { lat: 37.1, lng: 127.1 },
      { lat: 37.2, lng: 127.2 },
    ]);
    expect(result.fallbackUsed).toBe(false);
  });

  it("getRunRoute 는 fallback_used=true 도 그대로 전달한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: { road_path: [{ lat: 37.1, lng: 127.1 }], fallback_used: true, stops: [] },
        }),
      ),
    );

    const result = await getRunRoute(7);

    expect(result.fallbackUsed).toBe(true);
  });

  // R19 목표 1 — stops[] 도 다른 정차지 조회(getRouteDetail)와 같은 규칙(stop_id→stopId)
  // 으로 camelCase 로 바꾼다. id 값 자체를 대조해 "몇 개인가" 가 아니라 "어느 정차지인가"
  // 를 확인한다(phase-goal-loop — 개수만 세는 단언은 범위 조건을 못 잡는다).
  it("getRunRoute 는 stops[] 를 정차지 마커용으로 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            road_path: [],
            fallback_used: false,
            stops: [
              { stop_id: 3, seq: 1, name: "그린빌라 입구", lat: 37.5685, lng: 126.98 },
            ],
          },
        }),
      ),
    );

    const result = await getRunRoute(7);

    expect(result.stops).toEqual([{ stopId: 3, seq: 1, name: "그린빌라 입구", lat: 37.5685, lng: 126.98 }]);
  });
});
