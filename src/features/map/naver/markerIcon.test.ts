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

  // R19 목표 3 — 버스는 정차지·학생과 색·크기뿐 아니라 형태로도 구별돼야 한다
  // (사용자 지시, 그냥 파란 원이라 지도 POI 아이콘과 섞였다는 조율자 눈 확인).
  it("버스만 lucide 아이콘(svg)을 품고, 정차지·학생은 여전히 빈 원이다", () => {
    expect(buildMarkerIconHtml("bus")).toContain("<svg");
    expect(buildMarkerIconHtml("stop")).not.toContain("<svg");
    expect(buildMarkerIconHtml("student")).not.toContain("<svg");
  });
});

// R21-A 목표 1 — 고른 버스만 지도 위에서 다르게 보인다.
describe("markerIcon — 선택 강조(R21-A 목표 1)", () => {
  it("selected:true 인 버스는 흰 테두리(box-shadow)가 붙는다", () => {
    expect(buildMarkerIconHtml("bus", { selected: true })).toContain("box-shadow");
    expect(buildMarkerIconHtml("bus", { selected: false })).not.toContain("box-shadow");
    expect(buildMarkerIconHtml("bus")).not.toContain("box-shadow");
  });

  // 버스가 아닌 마커는 선택 개념이 없다 — 옵션을 줘도 원 모양이 그대로다.
  it("정차지·학생 마커는 selected 를 줘도 달라지지 않는다", () => {
    expect(buildMarkerIconHtml("stop", { selected: true })).toBe(buildMarkerIconHtml("stop"));
    expect(buildMarkerIconHtml("student", { selected: true })).toBe(buildMarkerIconHtml("student"));
  });
});

// R21-A 목표 2 — 버스끼리 구별하려고 번호를 마커에 표기한다.
describe("markerIcon — 버스 번호 표기(R21-A 목표 2)", () => {
  it("busNo 를 주면 그 번호 문자열이 아이콘 HTML 에 그대로 들어간다", () => {
    expect(buildMarkerIconHtml("bus", { busNo: "3호차" })).toContain("3호차");
  });

  it("busNo 가 없으면 이전과 같은 HTML(라벨 없음)이다", () => {
    expect(buildMarkerIconHtml("bus")).toBe(buildMarkerIconHtml("bus", {}));
  });
});

// R21-A 목표 3 — 같은 버스라도 등원·하원을 모양으로 구별한다(색은 C-09 4색 고정이라 못 쓴다).
describe("markerIcon — 등원·하원 모양 구별(R21-A 목표 3)", () => {
  it("등원(to_academy)과 하원(from_academy)은 서로 다른 아이콘 HTML 을 낸다", () => {
    const toAcademy = buildMarkerIconHtml("bus", { direction: "to_academy" });
    const fromAcademy = buildMarkerIconHtml("bus", { direction: "from_academy" });
    expect(toAcademy).not.toBe(fromAcademy);
  });

  it("direction 을 생략하면 등원과 같은 모양이다(기존 동작 보존)", () => {
    expect(buildMarkerIconHtml("bus")).toBe(buildMarkerIconHtml("bus", { direction: "to_academy" }));
  });
});
