import { afterEach, describe, expect, it, vi } from "vitest";
import { addRunWaypoint, getRouteDetail, getRoutes } from "./index";

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

  it("addRunWaypoint 는 routePreview 의 stopsBefore·After·reordered 를 각각 camelCase 로 바꾼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse(200, {
          success: true,
          data: {
            waypoint_id: 5,
            route_preview: {
              stops_before: [{ stop_id: 10, seq: 1, name: "정문", lat: 37.1, lng: 127.1 }],
              stops_after: [{ stop_id: 10, seq: 1, name: "정문", lat: 37.1, lng: 127.1 }],
              reordered: [{ stop_id: 99, seq: 1, name: "새 경유지", lat: 37.2, lng: 127.2 }],
            },
            est_time_before: 600,
            est_time_after: 720,
            est_distance_before: 5000,
            est_distance_after: 6000,
            applied: false,
          },
        }),
      ),
    );

    const result = await addRunWaypoint(7, { label: "새 경유지", lat: 37.2, lng: 127.2, apply: false });

    expect(result.waypointId).toBe(5);
    expect(result.routePreview.reordered).toEqual([
      { stopId: 99, seq: 1, name: "새 경유지", lat: 37.2, lng: 127.2 },
    ]);
    expect(result.applied).toBe(false);
  });
});
