import { describe, expect, it } from "vitest";
import { SELECTED_BUS_MAP_ZOOM, cameraForSelectedBus } from "./selectedBusCamera";

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
