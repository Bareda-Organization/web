import { describe, expect, it } from "vitest";
import { buildRouteDisplayState } from "./routeDisplayState";

// R18-B2 목표 3 — 세 화면이 §5.19 응답을 같은 규칙으로 지도에 옮긴다.
describe("buildRouteDisplayState", () => {
  it("좌표가 있으면 그 경로를 그리고, 근사 경로면 안내를 켠다", () => {
    const state = buildRouteDisplayState("9", "moving", {
      roadPath: [
        { lat: 37.1, lng: 127.1 },
        { lat: 37.2, lng: 127.2 },
      ],
      fallbackUsed: true,
      stops: [],
      confirmed: true,
    });

    expect(state.polylines).toEqual([
      {
        id: "route-9",
        points: [
          { lat: 37.1, lng: 127.1 },
          { lat: 37.2, lng: 127.2 },
        ],
        kind: "moving",
        approximate: true,
      },
    ]);
    expect(state.fallback).toBe(true);
    expect(state.missing).toBe(false);
    expect(state.noPlannedRoute).toBe(false);
    expect(state.planned).toBe(false);
  });

  it("좌표가 0개면 경로를 그리지 않고 missing 을 켠다 — fallbackUsed 와 무관하다", () => {
    const state = buildRouteDisplayState("9", "confirmed", {
      roadPath: [],
      fallbackUsed: true,
      stops: [],
      confirmed: true,
    });

    expect(state.polylines).toEqual([]);
    expect(state.missing).toBe(true);
    expect(state.noPlannedRoute).toBe(false);
    // 좌표 0개인데 "근사 경로" 를 동시에 띄우는 모순을 막는다(R18-B 조율자 판정).
    expect(state.fallback).toBe(false);
  });

  // Ruling 321 — idle 회차도 이제 고정 노선 기반 "예정" 경로를 받을 수 있어, 좌표
  // 유무가 아니라 백엔드가 보내는 `confirmed` 플래그로 "확정 전"과 "예정도 없음"을 가른다.
  it("idle 회차인데 고정 노선(예정)도 없으면 noPlannedRoute 를 켠다 — missing 이 아니다", () => {
    const state = buildRouteDisplayState("1", "idle", {
      roadPath: [],
      fallbackUsed: false,
      stops: [],
      confirmed: false,
    });

    expect(state.noPlannedRoute).toBe(true);
    expect(state.missing).toBe(false);
    expect(state.planned).toBe(false);
    expect(state.polylines).toEqual([]);
  });

  // Ruling 321 — idle 회차가 고정 노선 기반 예정 경로를 받으면 kind:"planned" 로
  // 그리고(회차 상태와 무관), planned 안내를 켠다. approximate 도 함께 켜서(대시 선)
  // "확정된 경로"로 오인하지 않게 한다.
  it("고정 노선 기반 예정 경로(confirmed=false)면 kind:planned 로 그리고 planned 를 켠다", () => {
    const state = buildRouteDisplayState("1", "idle", {
      roadPath: [{ lat: 37.1, lng: 127.1 }],
      fallbackUsed: false,
      stops: [],
      confirmed: false,
    });

    expect(state.polylines).toEqual([
      { id: "route-1", points: [{ lat: 37.1, lng: 127.1 }], kind: "planned", approximate: true },
    ]);
    expect(state.planned).toBe(true);
    expect(state.missing).toBe(false);
    expect(state.noPlannedRoute).toBe(false);
  });

  // R20-C 목표 3 — 확정된 폴리라인의 kind 가 회차 상태를 그대로 따라간다(운행
  // 중·운행 종료·확정). `routeColor.ts` 가 이 kind 로 색을 고른다.
  it.each([
    ["moving", "moving"],
    ["finished", "finished"],
    ["confirmed", "confirmed"],
  ] as const)("확정된 %s 회차의 폴리라인 kind 는 %s 다", (status, expectedKind) => {
    const state = buildRouteDisplayState("2", status, {
      roadPath: [{ lat: 37.1, lng: 127.1 }],
      fallbackUsed: false,
      stops: [],
      confirmed: true,
    });

    expect(state.polylines[0]?.kind).toBe(expectedKind);
  });

  // R19 목표 1 — stops[] 를 kind:"stop" 마커로 바꾼다. id 로 어느 정차지인지까지
  // 대조한다(개수만 세는 단언은 범위 조건을 못 잡는다).
  // 2026-09-23 — 순번도 싣는다(핀 안에 숫자, 사용자 지시). 정차지 id 와 순번은 다른 값이라
  // 둘을 일부러 다르게 둔다 — 섞어 넣어도 통과하면 이 시험은 아무것도 못 가린다.
  it('stops[] 를 kind:"stop" 마커로 바꾸고 순번을 싣는다', () => {
    const state = buildRouteDisplayState("9", "moving", {
      roadPath: [],
      fallbackUsed: false,
      stops: [
        { stopId: "1", seq: 2, lat: 37.5665, lng: 126.978 },
        { stopId: "4", seq: 1, lat: 37.5695, lng: 126.981 },
      ],
      confirmed: true,
    });

    expect(state.stopMarkers).toEqual([
      { id: "stop-1", lat: 37.5665, lng: 126.978, kind: "stop", seq: 2 },
      { id: "stop-4", lat: 37.5695, lng: 126.981, kind: "stop", seq: 1 },
    ]);
  });

  // R22 목표 2 — 출발지·도착지가 지도에 안 나온다(사용자 지시). §5.19 응답에 그 필드가
  // 없으므로 road_path 의 양 끝을 쓴다 — 좌표까지 대조해야 "양 끝"을 실제로 집었는지
  // 판정된다(첫 점·끝 점을 바꿔 넣어도 개수는 그대로다).
  it("road_path 의 첫 점과 끝 점을 출발지·도착지 마커로 만든다", () => {
    const state = buildRouteDisplayState("9", "confirmed", {
      roadPath: [
        { lat: 37.5665, lng: 126.978 },
        { lat: 37.52, lng: 127.0 },
        { lat: 37.4979, lng: 127.0276 },
      ],
      fallbackUsed: false,
      stops: [{ stopId: "1", seq: 1, lat: 37.5665, lng: 126.978 }],
      confirmed: true,
    });

    expect(state.stopMarkers).toEqual([
      { id: "stop-1", lat: 37.5665, lng: 126.978, kind: "stop", seq: 1 },
      { id: "origin-9", lat: 37.5665, lng: 126.978, kind: "origin" },
      { id: "destination-9", lat: 37.4979, lng: 127.0276, kind: "destination" },
    ]);
  });

  // W7 — API_SPEC §4.3·§5.19 `stops[].is_destination`(등원 회차의 마지막 항목,
  // 학원). road_path 끝점(destination 마커)과 같은 자리라 정차지 마커로 한 번 더
  // 찍으면 겹친다(`FIX-H.md §2` 관측) — 학원 항목은 정차지 마커 산출에서 뺀다.
  it("stops[] 의 is_destination=true 항목(학원)은 정차지 마커에서 뺀다", () => {
    const state = buildRouteDisplayState("9", "moving", {
      roadPath: [],
      fallbackUsed: false,
      stops: [
        { stopId: "1", seq: 1, lat: 37.5665, lng: 126.978, isDestination: false },
        { stopId: "9", seq: 2, lat: 37.4979, lng: 127.0276, isDestination: true },
      ],
      confirmed: true,
    });

    expect(state.stopMarkers).toEqual([{ id: "stop-1", lat: 37.5665, lng: 126.978, kind: "stop", seq: 1 }]);
  });

  // 한 점짜리 경로는 출발지와 도착지가 같은 자리다 — 겹쳐 찍어도 읽히지 않아 만들지 않는다.
  it("road_path 좌표가 2개 미만이면 출발지·도착지 마커를 만들지 않는다", () => {
    const oneS = buildRouteDisplayState("9", "confirmed", {
      roadPath: [{ lat: 37.5665, lng: 126.978 }],
      fallbackUsed: false,
      stops: [],
      confirmed: true,
    });
    const none = buildRouteDisplayState("9", "confirmed", {
      roadPath: [],
      fallbackUsed: false,
      stops: [],
      confirmed: true,
    });

    expect(oneS.stopMarkers).toEqual([]);
    expect(none.stopMarkers).toEqual([]);
  });
});
