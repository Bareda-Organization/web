import { describe, expect, it } from "vitest";
import { SELECTED_BUS_MAP_ZOOM, anchorForSelection, cameraForSelectedBus } from "./selectedBusCamera";

// R18-B2 목표 3 — 세 화면이 같은 확대 수준을 쓴다는 것을 이 공유 함수 하나로 고정한다.
describe("cameraForSelectedBus", () => {
  it("선택된 마커가 있으면 그 좌표로 확대한다", () => {
    const fallback = { lat: 0, lng: 0, zoom: 12 };
    expect(cameraForSelectedBus({ lat: 37.1, lng: 127.1 }, fallback)).toEqual({
      lat: 37.1,
      lng: 127.1,
      zoom: SELECTED_BUS_MAP_ZOOM,
    });
  });

  it("선택된 마커가 없으면 화면이 준 기본값을 그대로 쓴다", () => {
    const fallback = { lat: 0, lng: 0, zoom: 12 };
    expect(cameraForSelectedBus(null, fallback)).toBe(fallback);
  });
});

// R21-A 목표 4 — 실시간 위치가 없는 회차(idle·확정·종료)를 골라도 정차지가 보이도록
// 카메라 중심 후보를 정한다.
describe("anchorForSelection", () => {
  it("실시간 버스 위치가 있으면 그 좌표를 그대로 쓴다(정차지 유무와 무관)", () => {
    const live = { lat: 37.1, lng: 127.1 };
    expect(anchorForSelection(live, [{ lat: 0, lng: 0 }])).toBe(live);
  });

  it("실시간 위치가 없으면 정차지들의 평균 좌표를 대신 쓴다", () => {
    const stops = [
      { lat: 37.0, lng: 127.0 },
      { lat: 37.2, lng: 127.2 },
    ];
    expect(anchorForSelection(null, stops)).toEqual({ lat: 37.1, lng: 127.1 });
  });

  it("실시간 위치도 정차지도 없으면 null 이다(화면이 기본값으로 떨어진다)", () => {
    expect(anchorForSelection(null, [])).toBeNull();
  });
});
