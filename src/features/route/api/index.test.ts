import { afterEach, describe, expect, it, vi } from "vitest";
import { getRouteDetail, getRoutePath, getRoutes, getRunRoute, saveRouteStops, suggestStops } from "./index";

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
              { id: 1, bus_id: 3, bus_no: "1호차", weekday: "mon", direction: "to_academy", name: "1반 등원", active: true, stop_count: 3 },
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
      { id: "1", busId: "3", busNo: "1호차", weekday: "mon", direction: "to_academy", name: "1반 등원", active: true, stopCount: 3 },
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

    const result = await getRouteDetail("1");

    expect(result.stops).toEqual([{ stopId: "10", seq: 1, name: "정문", lat: 37.1, lng: 127.1, isDestination: false, isWaypoint: false, change: null }]);
    expect(result.busNo).toBe("1호차");
  });

  // 2026-09-23 — 저장은 한 요청이다. 새 항목은 stop_id 를 null 로 보내야 서버가 새로 만든다 —
  // 키를 빼거나 0 을 보내면 "없는 승하차지" 로 읽혀 422 가 난다.
  it("saveRouteStops 는 목록 순서 그대로 snake_case 로 보내고 새 항목의 stop_id 는 null 이다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(200, {
        success: true,
        data: { id: 1, bus_id: 3, bus_no: "1호차", weekday: "mon", direction: "to_academy", name: null, active: true,
          stops: [] },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await saveRouteStops("1", [
      { stopId: "7", name: "정문", lat: 37.1, lng: 127.1 },
      { name: "새 모퉁이", address: "서울시 새길 7", lat: 37.2, lng: 127.2 },
    ]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/staff/routes/1/stops");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({
      stops: [
        { stop_id: "7", name: "정문", address: null, lat: 37.1, lng: 127.1 },
        { stop_id: null, name: "새 모퉁이", address: "서울시 새길 7", lat: 37.2, lng: 127.2 },
      ],
    });
  });

  it("suggestStops 는 후보마다 display_name·nearby 를 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: { items: [{ lat: 37.1, lng: 127.1, display_name: "서울시 목동서로 1",
            nearby: [{ stop_id: 9, name: "앞", address: "목동서로 1", lat: 37.1, lng: 127.1, distance_m: 4 }] }] },
        }),
      ),
    );

    expect(await suggestStops("목동서로")).toEqual([
      { lat: 37.1, lng: 127.1, displayName: "서울시 목동서로 1",
        nearby: [{ stopId: "9", name: "앞", address: "목동서로 1", lat: 37.1, lng: 127.1, distanceM: 4 }] },
    ]);
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

    const result = await getRunRoute("7");

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

    const result = await getRunRoute("7");

    expect(result.fallbackUsed).toBe(true);
  });

  // R39 Ruling 400 — 경유 지점은 다른 필드가 승하차지와 같은 모양이라 `is_waypoint` 로만 가른다.
  // 미경유(`change=skipped`)도 함께 읽는다. 둘 다 없는 응답(고정 노선 등)은 false·null 이다.
  it("getRunRoute 는 stops[].is_waypoint·change 를 읽고, 없으면 false·null 로 둔다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            road_path: [],
            fallback_used: false,
            stops: [
              { stop_id: 11, seq: 1, name: "가", lat: 37.5, lng: 127.0, change: "skipped", is_waypoint: false },
              { stop_id: 12, seq: 2, name: "주유소", lat: 37.51, lng: 127.01, change: null, is_waypoint: true },
              { stop_id: 13, seq: 3, name: "나", lat: 37.52, lng: 127.02 },
            ],
          },
        }),
      ),
    );

    const result = await getRunRoute("7");

    expect(result.stops.map((s) => [s.name, s.isWaypoint, s.change])).toEqual([
      ["가", false, "skipped"],
      ["주유소", true, null],
      ["나", false, null],
    ]);
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

    const result = await getRunRoute("7");

    expect(result.stops).toEqual([{ stopId: "3", seq: 1, name: "그린빌라 입구", lat: 37.5685, lng: 126.98, isDestination: false, isWaypoint: false, change: null }]);
  });

  // R27-B — GET /staff/routes/{id}/path. getRunRoute 와 같은 road_path·fallback_used·
  // stops 변환을 쓰되(§5.19 와 같은 raw 모양) confirmed 필드가 없는 것까지 함께 본다.
  it("getRoutePath 는 road_path·fallback_used·stops 를 camelCase 로 바꾼다", async () => {
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
            fallback_used: true,
            stops: [{ stop_id: 10, seq: 1, name: "정문", lat: 37.1, lng: 127.1 }],
          },
        }),
      ),
    );

    const result = await getRoutePath("1");

    expect(result.roadPath).toEqual([
      { lat: 37.1, lng: 127.1 },
      { lat: 37.2, lng: 127.2 },
    ]);
    expect(result.fallbackUsed).toBe(true);
    expect(result.stops).toEqual([{ stopId: "10", seq: 1, name: "정문", lat: 37.1, lng: 127.1, isDestination: false, isWaypoint: false, change: null }]);
  });
});
