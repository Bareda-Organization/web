import { describe, expect, it } from "vitest";
import { MARKER_SIZE_PX, buildMarkerIconHtml } from "./markerIcon";

// R18-B 목표 1 — 버스 아이콘이 한눈에 보여야 하고, 정차지·학생 마커와 크기로
// 구별돼야 한다(수정 전에는 세 종류 전부 12px 로 같아 색으로만 겨우 구별됐다 —
// 보고서 §1 실측). 크기 관계(버스 > 정차지 > 학생)를 고정한다.
describe("markerIcon — 종류별 크기 관계(R18-B 목표 1)", () => {
  it("버스가 정차지보다 크고, 정차지가 학생보다 크다", () => {
    expect(MARKER_SIZE_PX.bus).toBeGreaterThan(MARKER_SIZE_PX.stop);
    expect(MARKER_SIZE_PX.stop).toBeGreaterThan(MARKER_SIZE_PX.student);
  });

  it("버스 아이콘이 수정 전 실측값(12px)보다 뚜렷하게 크다", () => {
    expect(MARKER_SIZE_PX.bus).toBeGreaterThanOrEqual(24);
  });

  it("아이콘 HTML 에 종류별 크기가 그대로 반영된다", () => {
    const html = buildMarkerIconHtml("bus");
    expect(html).toContain(`width:${MARKER_SIZE_PX.bus}px`);
    expect(html).toContain(`height:${MARKER_SIZE_PX.bus}px`);
  });
});
