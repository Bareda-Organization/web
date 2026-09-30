import { describe, expect, it } from "vitest";
import { emergencyMapUrl } from "./mapLink";

// R36-FE FE3 — 제품 지도는 네이버다. 좌표에 핀이 찍혀 열리는 네이버 지도 웹 주소여야 한다(순서는 위도,경도).
describe("emergencyMapUrl", () => {
  const url = new URL(emergencyMapUrl({ lat: 37.5666103, lng: 126.9783882 }));

  it("네이버 지도 호스트다", () => {
    expect(url.host).toBe("map.naver.com");
  });

  it("좌표를 위도,경도 순서로 싣는다", () => {
    expect(decodeURIComponent(url.pathname + url.search)).toContain("37.5666103,126.9783882");
  });

  it("구글 주소가 아니다", () => {
    expect(url.href).not.toContain("google");
  });
});
