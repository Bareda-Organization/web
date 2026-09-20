import { describe, expect, it } from "vitest";
import { MARKER_SIZE_PX, buildMarkerIconHtml, busColorOf } from "./markerIcon";

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
  // R21-A 추가 지시 ② — 구간변경 승인 지도의 "변한 승하차지"도 이 강조 수단을
  // 그대로 쓴다(버스 전용이 아니다). 종류별 색(초록·주황)을 테두리 색으로 그대로
  // 쓴다 — 파란 테두리만 고정이면 정차지·학생 마커에 안 어울린다.
  it("정차지·학생 마커도 selected 를 주면 흰 테두리가 붙고, 테두리 색은 그 종류의 색을 쓴다", () => {
    expect(buildMarkerIconHtml("stop", { selected: true })).toContain("box-shadow");
    expect(buildMarkerIconHtml("stop", { selected: true })).toContain("#16a34a");
    expect(buildMarkerIconHtml("student", { selected: true })).toContain("box-shadow");
    expect(buildMarkerIconHtml("student", { selected: true })).toContain("#f97316");
    expect(buildMarkerIconHtml("stop")).not.toContain("box-shadow");
    expect(buildMarkerIconHtml("student")).not.toContain("box-shadow");
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

// R22 목표 1 — 버스마다 아이콘이 달라야 한다(사용자 지시 — 전부 같은 파란 원이라
// 어느 버스인지 모른다). 번호를 핀 안으로 넣어 아이콘 자체를 갈랐다.
describe("markerIcon — 버스마다 다른 아이콘(R22 목표 1)", () => {
  it("번호가 다른 두 버스는 아이콘 HTML 자체가 다르다", () => {
    const one = buildMarkerIconHtml("bus", { busNo: "1호차", direction: "to_academy" });
    const two = buildMarkerIconHtml("bus", { busNo: "2호차", direction: "to_academy" });

    expect(one).not.toBe(two);
    expect(one).toContain("1호차");
    expect(two).toContain("2호차");
  });

  // 같은 버스라도 등원·하원은 갈려야 한다 — 번호만 넣고 방향 아이콘을 빠뜨리면
  // 두 회차가 같은 그림이 된다(R21-A 목표 3 이 세운 구별을 R22 가 무너뜨리지 않는지).
  it("같은 번호라도 등원·하원은 아이콘 HTML 이 다르다", () => {
    const toAcademy = buildMarkerIconHtml("bus", { busNo: "1호차", direction: "to_academy" });
    const fromAcademy = buildMarkerIconHtml("bus", { busNo: "1호차", direction: "from_academy" });

    expect(toAcademy).not.toBe(fromAcademy);
  });

  it("번호가 핀 안에 들어가 별도 라벨 요소를 만들지 않는다", () => {
    const html = buildMarkerIconHtml("bus", { busNo: "1호차" });

    // R21-A 는 핀(span) 과 라벨(span) 을 세로로 쌓는 <div> 를 만들었다 — 축소하면
    // 라벨끼리 겹쳐 읽히지 않아 핀 하나로 합쳤다.
    expect(html).not.toContain("flex-direction:column");
    expect(html).toContain("<svg");
  });

  it("고른 버스는 번호 칩에도 흰 테두리가 붙는다", () => {
    expect(buildMarkerIconHtml("bus", { busNo: "1호차", selected: true })).toContain("box-shadow");
    expect(buildMarkerIconHtml("bus", { busNo: "1호차", selected: false })).not.toContain("box-shadow");
  });
});

// R22 추가 지시 — 번호만으로는 한눈에 안 갈려서 색도 버스마다 다르게 한다(사용자 지시).
describe("markerIcon — 버스마다 다른 색(R22 추가 지시)", () => {
  it("번호가 다르면 색도 다르다 — 시드의 1·2호차가 실제로 갈린다", () => {
    expect(busColorOf("1호차")).not.toBe(busColorOf("2호차"));
    expect(buildMarkerIconHtml("bus", { busNo: "1호차" })).toContain(busColorOf("1호차"));
  });

  // 색을 목록 순서로 정하면 회차가 늘거나 줄 때, 또 화면(관제·대시보드·금일 운행)마다
  // 같은 버스가 다른 색이 된다. 번호 문자열만 보고 정했는지를 검사한다.
  it("같은 번호는 언제 불러도 같은 색이다", () => {
    expect(busColorOf("3호차")).toBe(busColorOf("3호차"));
    expect(busColorOf("가나다호차")).toBe(busColorOf("가나다호차"));
  });

  // 지도 위에서 상태를 뜻하는 것은 노선 선 색이다(routeColor.ts) — 버스 색이 그 4색과
  // 겹치면 색 하나가 두 가지를 뜻하게 된다. 정차지·학생 색과도 겹치면 안 된다.
  it("버스 색은 회차 상태 4색·정차지·학생 색과 겹치지 않는다", () => {
    const 금지 = ["#C77E12", "#1F5C4D", "#C93F2C", "#6B7672", "#16a34a", "#f97316", "#2A312E"];
    for (const busNo of ["1호차", "2호차", "3호차", "4호차", "5호차", "6호차", "7호차", "8호차"]) {
      expect(금지).not.toContain(busColorOf(busNo));
    }
  });
});

// R22 목표 2 — 출발지·도착지 마커(사용자 지시 — 지도에 표시가 안 된다).
describe("markerIcon — 출발지·도착지(R22 목표 2)", () => {
  it("출발지·도착지는 글자로 서로 구별되고 정차지보다 크다", () => {
    expect(buildMarkerIconHtml("origin")).toContain("출발");
    expect(buildMarkerIconHtml("destination")).toContain("도착");
    expect(buildMarkerIconHtml("origin")).not.toBe(buildMarkerIconHtml("destination"));
    expect(MARKER_SIZE_PX.origin).toBeGreaterThan(MARKER_SIZE_PX.stop);
    expect(MARKER_SIZE_PX.destination).toBeGreaterThan(MARKER_SIZE_PX.stop);
  });

  // 버스 파랑·정차지 초록·학생 주황 어디와도 안 겹쳐야 같은 자리에 겹쳐 찍혀도 읽힌다.
  it("출발지·도착지 색은 버스·정차지·학생 어느 것과도 다르다", () => {
    const endpoint = buildMarkerIconHtml("origin");

    expect(endpoint).not.toContain("#2563eb");
    expect(endpoint).not.toContain("#16a34a");
    expect(endpoint).not.toContain("#f97316");
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

// R25 목표 2 — 마커는 제 좌표 **위에 가운데로** 놓여야 한다. SDK 의 HTML 아이콘은
// size·anchor 없이는 좌상단을 좌표에 맞춰서, 고치기 전에는 모든 마커가 아이콘 절반만큼
// 오른쪽·아래로 밀려 그려졌다(2026-09-20 실측 — 정중앙에 놓은 버스가 38px 벗어났다).
describe("markerIcon — 좌표 위에 가운데로(R25 목표 2)", () => {
  it("모든 종류가 제 크기의 절반만큼 되밀린 채로 나온다", () => {
    for (const kind of ["bus", "stop", "student", "origin", "destination"] as const) {
      expect(buildMarkerIconHtml(kind)).toContain("translate(-50%,-50%)");
    }
    expect(buildMarkerIconHtml("bus", { busNo: "3호차" })).toContain("translate(-50%,-50%)");
  });
});
