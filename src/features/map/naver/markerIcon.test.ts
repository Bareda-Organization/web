import { describe, expect, it, vi } from "vitest";
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
  // 사용자 지시(2026-09-23) — 정차지는 물방울 핀이라 svg 경로로 그린다. 학생은 여전히 빈 원이다.
  it("버스는 lucide 아이콘, 정차지는 핀 경로(svg)를 품고, 학생은 빈 원이다", () => {
    expect(buildMarkerIconHtml("bus")).toContain("<svg");
    expect(buildMarkerIconHtml("stop")).toContain("<path");
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
  it("정차지·학생 마커도 selected 를 주면 테두리가 붙고, 테두리 색은 그 종류의 색을 쓴다", () => {
    // 정차지 핀은 box-shadow 가 사각형으로 그려져 핀 모양을 따라가지 못한다 — 핀 윤곽을 따라 긋는
    // 굵은 선(stroke)으로 두른다.
    expect(buildMarkerIconHtml("stop", { selected: true })).toContain('stroke="#16a34a"');
    expect(buildMarkerIconHtml("stop")).not.toContain('stroke="#16a34a"');
    expect(buildMarkerIconHtml("student", { selected: true })).toContain("box-shadow");
    expect(buildMarkerIconHtml("student", { selected: true })).toContain("#f97316");
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
  it("정차지를 뺀 모든 종류가 제 크기의 절반만큼 되밀린 채로 나온다", () => {
    for (const kind of ["bus", "student", "origin", "destination"] as const) {
      expect(buildMarkerIconHtml(kind)).toContain("translate(-50%,-50%)");
    }
    expect(buildMarkerIconHtml("bus", { busNo: "3호차" })).toContain("translate(-50%,-50%)");
  });
});

// 사용자 지시(2026-09-22) — "각 정차지도 표기해줘". 고정 노선 편성 지도에서 정차지가 여럿
// 겹쳐 찍히면 어느 것이 몇 번째인지 알 수 없다. 순번을 받으면 핀 안에 그 숫자를 넣는다
// (버스 칩이 호차를 넣는 것과 같은 형태).
describe("정차지 순번 표기", () => {
  it("순번을 주면 핀 안에 그 숫자가 들어간다", () => {
    const html = buildMarkerIconHtml("stop", { seq: 3 });

    expect(html).toContain(">3<");
  });

  it("순번이 없으면 숫자 없는 핀이다", () => {
    expect(buildMarkerIconHtml("stop", {})).not.toContain("<text");
  });
});

// 사용자 지시(2026-09-23) — 정차지는 "끝이 좌표를 가리키는 물방울 핀 + 순번". 가운데를 좌표에 맞추면
// 핀 끝이 좌표보다 반 칸 아래를 찌른다 — 핀의 아래 끝(끝점)을 좌표에 맞춘다.
describe("정차지 핀 — 끝이 좌표를 가리킨다", () => {
  it("가로는 가운데, 세로는 제 높이 전체만큼 올려 끝점이 좌표에 온다", () => {
    const html = buildMarkerIconHtml("stop", { seq: 3 });

    expect(html).toContain("translate(-50%,-100%)");
    expect(html).not.toContain("translate(-50%,-50%)");
  });

  it("두 자리 순번도 핀 안에 들어간다", () => {
    expect(buildMarkerIconHtml("stop", { seq: 15 })).toContain(">15<");
  });
});

// F01-02 — 호차명(`bus_no`)은 관계자가 입력하는 문자열이고 SDK 는 이 HTML 을 그대로 DOM 에 넣는다.
// 태그·속성 문자가 그대로 실리면 같은 학원 관계자 브라우저에서 임의 스크립트가 실행된다.
describe("markerIcon — 사용자 입력 이스케이프(F01-02)", () => {
  it("호차명의 태그·따옴표는 텍스트로만 들어가고 태그로 살아나지 않는다", () => {
    const html = buildMarkerIconHtml("bus", { busNo: '<img src=x onerror="alert(1)">', direction: "to_academy" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("마커 id 의 따옴표가 data-marker-id 속성을 깨고 나오지 못한다", () => {
    const html = buildMarkerIconHtml("bus", { busNo: "1호차", direction: "to_academy", markerId: '7" onmouseover="x' });
    expect(html).not.toContain('onmouseover="x');
    expect(html).toContain('data-marker-id="7&quot; onmouseover=&quot;x"');
  });
});

// W2-01(F03-05·F03-11) — 관제 지도에서 비상 회차의 버스를 강조한다. 색은 C-09 회차 상태 4색을
// 새로 만들 수 없어 기존 버스 색은 그대로 두고 **테두리만** 붉게 바꾼다.
describe("markerIcon — 비상 강조(W2-01)", () => {
  const EMERGENCY_BORDER = "border:3px solid #dc2626";

  it("emergency:true 인 버스 칩은 붉은 테두리가 붙고, 버스 색(배경)은 그대로다", () => {
    const html = buildMarkerIconHtml("bus", { busNo: "3호차", emergency: true });
    expect(html).toContain(EMERGENCY_BORDER);
    expect(html).toContain(`background:${busColorOf("3호차")}`);
  });

  it("emergency 가 없거나 false 면 붉은 테두리가 없다", () => {
    expect(buildMarkerIconHtml("bus", { busNo: "3호차" })).not.toContain("#dc2626");
    expect(buildMarkerIconHtml("bus", { busNo: "3호차", emergency: false })).not.toContain("#dc2626");
  });

  it("고른 버스가 비상이어도 선택 띠와 붉은 테두리가 함께 남는다", () => {
    const html = buildMarkerIconHtml("bus", { busNo: "3호차", emergency: true, selected: true });
    expect(html).toContain(EMERGENCY_BORDER);
    expect(html).toContain(`0 0 0 6px ${busColorOf("3호차")}`);
  });

  it("비상 여부가 바뀌면 아이콘 문자열이 달라져 지도가 아이콘을 다시 그린다", () => {
    expect(buildMarkerIconHtml("bus", { busNo: "3호차", emergency: true })).not.toBe(
      buildMarkerIconHtml("bus", { busNo: "3호차" }),
    );
  });
});

// R39 Ruling 400 — 강제 경유 지점은 승하차지 핀과 모양이 다른 번호 없는 칩 + "경유" 글자이고, 미경유 승하차지는
// 흐리게(불투명도 · 회색) + 번호 취소선이다. 색만으로 가르지 않는다(글자·모양·취소선이 수단).
describe("markerIcon — 경유 지점 · 미경유 표기(R39 Ruling 400)", () => {
  it("경유 지점은 '경유' 글자가 있고 승하차지 핀(svg)이나 번호가 아니다", () => {
    const html = buildMarkerIconHtml("waypoint", { markerId: "waypoint-12", seq: 5 });

    expect(html).toContain("경유");
    expect(html).toContain('data-marker-id="waypoint-12"');
    expect(html).not.toContain("<svg");
    // seq 를 실수로 넘겨도 번호를 그리지 않는다 — 경유 지점은 번호를 세지 않는다.
    expect(html).not.toContain(">5<");
  });

  it("미경유 승하차지는 흐리고 번호에 취소선이 있으며, 정상 승하차지와 아이콘이 다르다", () => {
    const normal = buildMarkerIconHtml("stop", { seq: 2 });
    const skipped = buildMarkerIconHtml("stop", { seq: 2, skipped: true });

    expect(skipped).not.toBe(normal);
    expect(skipped).toContain("opacity");
    expect(skipped).toContain("line-through");
    expect(normal).not.toContain("line-through");
    expect(normal).not.toContain("opacity");
  });
});

// R46-WEB — 모듈 최상위에서 renderToStaticMarkup 을 부르면 서버 렌더링 도중 이 모듈이 처음 불릴 때 "렌더 안의 렌더" 가 되어
// 관계자·관리자 모든 화면이 Invalid hook call(500) 을 냈다. 불러오는 것만으로는 렌더하지 않고, 처음 쓸 때 한 번만 굳힌다.
describe("markerIcon — 모듈 로드 시점", () => {
  it("모듈을 불러올 때는 정적 마크업을 만들지 않고, 같은 방향의 버스 아이콘은 한 번만 만든다", async () => {
    vi.resetModules();
    const renderToStaticMarkup = vi.fn(() => "<svg/>");
    vi.doMock("react-dom/server", () => ({ renderToStaticMarkup }));

    const fresh = await import("./markerIcon");
    expect(renderToStaticMarkup).not.toHaveBeenCalled();

    fresh.buildMarkerIconHtml("bus", { busNo: "1호차", direction: "to_academy" });
    fresh.buildMarkerIconHtml("bus", { busNo: "2호차", direction: "to_academy" });
    expect(renderToStaticMarkup).toHaveBeenCalledTimes(1);

    vi.doUnmock("react-dom/server");
  });
});
