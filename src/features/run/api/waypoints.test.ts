import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteWaypoint, postWaypoint } from "./index";

// §5.15 — 미리보기(apply=false) → 배포(apply=true + preview_token) 두 단계. 배포 요청이 토큰을 빼먹으면 서버가 409 PREVIEW_STALE 이다.
const mockJsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const rawPreview = {
  success: true,
  data: {
    waypoint_id: 55,
    preview_token: "tok-1",
    applied: false,
    route_preview: {
      stops_before: [{ seq: 1, stop_name: "가", eta: "2026-10-13T07:10:00+09:00", lat: 37.5, lng: 127.0 }],
      stops_after: [
        { seq: 1, stop_name: "가", eta: "2026-10-13T07:10:00+09:00", lat: 37.5, lng: 127.0 },
        { seq: 2, stop_name: "주유소", eta: "2026-10-13T07:15:00+09:00", lat: 37.51, lng: 127.01 },
      ],
      reordered: [{ stop_id: 3, stop_name: "나", lat: 37.52, lng: 127.02 }],
      removed: [],
      road_path_before: [{ lat: 37.5, lng: 127.0 }],
      road_path_after: [
        { lat: 37.5, lng: 127.0 },
        { lat: 37.51, lng: 127.01 },
      ],
    },
    est_distance_before: 4.2,
    est_distance_after: 5.0,
    est_duration_before: 20,
    est_duration_after: 24,
  },
};

describe("run api — postWaypoint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("미리보기는 apply=false 와 좌표·표시명·자리를 snake_case 로 보내고 전후 비교를 camelCase 로 돌려준다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(200, rawPreview));
    vi.stubGlobal("fetch", fetchMock);

    const result = await postWaypoint("7", { address: "서울 양천구 목동동로 257", lat: 37.51, lng: 127.01, label: "주유소", seq: 2, apply: false });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/staff/runs/7/waypoints");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      address: "서울 양천구 목동동로 257",
      lat: 37.51,
      lng: 127.01,
      label: "주유소",
      seq: 2,
      apply: false,
    });
    expect(result.previewToken).toBe("tok-1");
    expect(result.waypointId).toBe("55");
    expect(result.applied).toBe(false);
    expect(result.estDurationBefore).toBe(20);
    expect(result.estDistanceAfter).toBe(5.0);
    expect(result.routePreview.stopsAfter.map((s) => s.stopName)).toEqual(["가", "주유소"]);
    expect(result.routePreview.reordered).toEqual([{ stopId: "3", stopName: "나" }]);
    expect(result.routePreview.roadPathAfter).toHaveLength(2);
  });

  it("배포는 apply=true 와 preview_token 을 싣는다 — seq 를 생략하면 본문에 싣지 않는다(맨 뒤)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(200, { success: true, data: { ...rawPreview.data, applied: true, preview_token: null } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await postWaypoint("7", { lat: 37.51, lng: 127.01, label: "주유소", apply: true, previewToken: "tok-1" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({ lat: 37.51, lng: 127.01, label: "주유소", apply: true, preview_token: "tok-1" });
    expect(result.applied).toBe(true);
    expect(result.previewToken).toBeNull();
  });
});

describe("run api — deleteWaypoint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("삭제 미리보기는 apply=false 를 쿼리로 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(200, rawPreview));
    vi.stubGlobal("fetch", fetchMock);

    await deleteWaypoint("7", "55", { apply: false });

    const [url, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("DELETE");
    expect(String(url)).toContain("/staff/runs/7/waypoints/55");
    expect(String(url)).toContain("apply=false");
    expect(String(url)).not.toContain("preview_token");
  });

  it("삭제 배포는 apply=true 와 preview_token 을 쿼리로 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse(200, { success: true, data: { ...rawPreview.data, applied: true } }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteWaypoint("7", "55", { apply: true, previewToken: "tok-9" });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("apply=true");
    expect(url).toContain("preview_token=tok-9");
  });
});
