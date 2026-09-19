import { describe, expect, it } from "vitest";
import { buildRouteDisplayState } from "./routeDisplayState";

// R18-B2 목표 3 — 세 화면이 §5.19 응답을 같은 규칙으로 지도에 옮긴다.
describe("buildRouteDisplayState", () => {
  it("좌표가 있으면 그 경로를 그리고, 근사 경로면 안내를 켠다", () => {
    const state = buildRouteDisplayState(9, {
      roadPath: [
        { lat: 37.1, lng: 127.1 },
        { lat: 37.2, lng: 127.2 },
      ],
      fallbackUsed: true,
      stops: [],
    });

    expect(state.polylines).toEqual([
      {
        id: "route-9",
        points: [
          { lat: 37.1, lng: 127.1 },
          { lat: 37.2, lng: 127.2 },
        ],
        kind: "route",
      },
    ]);
    expect(state.fallback).toBe(true);
    expect(state.missing).toBe(false);
  });

  it("좌표가 0개면 경로를 그리지 않고 missing 을 켠다 — fallbackUsed 와 무관하다", () => {
    const state = buildRouteDisplayState(9, { roadPath: [], fallbackUsed: true, stops: [] });

    expect(state.polylines).toEqual([]);
    expect(state.missing).toBe(true);
    // 좌표 0개인데 "근사 경로" 를 동시에 띄우는 모순을 막는다(R18-B 조율자 판정).
    expect(state.fallback).toBe(false);
  });

  // R19 목표 1 — stops[] 를 kind:"stop" 마커로 바꾼다. id 로 어느 정차지인지까지
  // 대조한다(개수만 세는 단언은 범위 조건을 못 잡는다).
  it("stops[] 를 kind:\"stop\" 마커로 바꾼다", () => {
    const state = buildRouteDisplayState(9, {
      roadPath: [],
      fallbackUsed: false,
      stops: [
        { stopId: 1, lat: 37.5665, lng: 126.978 },
        { stopId: 4, lat: 37.5695, lng: 126.981 },
      ],
    });

    expect(state.stopMarkers).toEqual([
      { id: "stop-1", lat: 37.5665, lng: 126.978, kind: "stop" },
      { id: "stop-4", lat: 37.5695, lng: 126.981, kind: "stop" },
    ]);
  });
});
