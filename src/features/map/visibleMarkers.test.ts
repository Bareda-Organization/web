import { describe, expect, it } from "vitest";
import { visibleMarkers } from "./visibleMarkers";
import type { MapMarker } from "./types";

const bus = (id: string): MapMarker => ({ id, lat: 37.5, lng: 127, kind: "bus", busNo: `${id}호차` });
const stop = (id: string): MapMarker => ({ id, lat: 37.5, lng: 127, kind: "stop" });

// R23 목표 4 — 버스를 고르면 그 버스와 그 노선만 남긴다(사용자 지시 — 여러 대가 동시에
// 움직이면 고른 버스의 경로가 다른 마커에 가린다).
describe("visibleMarkers", () => {
  it("고른 버스가 없으면 버스를 전부 보여 준다", () => {
    const result = visibleMarkers([bus("1"), bus("2"), bus("3")], [], null);

    expect(result.map((marker) => marker.id)).toEqual(["1", "2", "3"]);
  });

  // id 까지 대조한다 — 개수만 세면 "엉뚱한 버스 하나를 남겼다" 를 못 잡는다.
  it("고른 버스가 있으면 그 버스 하나와 그 노선 마커만 남는다", () => {
    const result = visibleMarkers([bus("1"), bus("2"), bus("3")], [stop("stop-7"), stop("stop-8")], "2");

    expect(result.map((marker) => marker.id)).toEqual(["2", "stop-7", "stop-8"]);
  });

  // 대기·확정·종료 회차는 실시간 위치가 없어 버스 마커 자체가 없다 — 그래도 노선은 보여야 한다.
  it("고른 회차에 실시간 위치가 없으면 노선 마커만 남는다", () => {
    const result = visibleMarkers([bus("1")], [stop("origin-9"), stop("destination-9")], "9");

    expect(result.map((marker) => marker.id)).toEqual(["origin-9", "destination-9"]);
  });
});
