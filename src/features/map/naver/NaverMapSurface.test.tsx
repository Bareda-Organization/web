import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 이 파일이 잡는 것 — **지도가 준비되기 전에 이미 자료가 들어와 있는 경우.**
//
// 지도 생성은 SDK 적재를 기다리는 비동기라, 마운트 직후에는 `mapRef.current` 가
// 아직 `null` 이다. 마커·노선·카메라 갱신 effect 는 그때 일찍 반환하는데, 그 뒤로
// **의존성이 바뀌지 않으면 다시 실행되지 않는다.**
//
// 관제·운행 관리 화면은 자료를 비동기로 받아 상태가 뒤늦게 바뀌므로 우연히
// 동작했다. 반면 구간변경 승인 상세는 **자료를 이미 들고 마운트**하므로 그 한 번의
// 이른 실행이 전부였고, 지도 타일만 뜨고 **경로 선이 영영 안 그려졌다**
// (2026-09-19 사용자 지적 → 조율자가 실제 브라우저로 재현).
//
// ⚠ SDK 를 쓰는 배선에 검사가 하나도 없어서 이 결함이 살아남았다 — 이 디렉터리의
// 기존 검사는 전부 순수 함수(`markerIcon`·`routeColor`·`markerInterpolation`)다.
const { loadNaverMapsScript, onNaverAuthFailure } = vi.hoisted(() => ({
  loadNaverMapsScript: vi.fn(),
  onNaverAuthFailure: vi.fn(() => () => {}),
}));

vi.mock("./loadNaverMapsScript", () => ({ loadNaverMapsScript, onNaverAuthFailure }));
vi.mock("./naverMapConfig", () => ({ getNaverMapClientId: () => "test-client-id" }));

import { NaverMapSurface } from "./NaverMapSurface";

/** SDK 적재를 손으로 풀 수 있게 붙잡아 둔다 — "지도가 늦게 생기는" 상황의 재현 수단. */
const heldScriptLoad = () => {
  let release!: () => void;
  loadNaverMapsScript.mockReturnValue(new Promise<void>((resolve) => {
    release = resolve;
  }));
  return () => {
    release();
    // 적재 완료 → 지도 생성까지 마이크로태스크 한 바퀴
    return Promise.resolve();
  };
};

const polylineCtor = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  polylineCtor.mockClear();
  (window as unknown as { naver: unknown }).naver = {
    maps: {
      // 실제 SDK 의 `Map` 이 갖는 것 중 이 컴포넌트가 부르는 것만 흉내 낸다 —
      // 빠뜨리면 카메라 effect 가 던져서 뒤따르는 노선 effect 까지 멈춘다.
      Map: vi.fn(() => ({ setCenter: vi.fn(), setZoom: vi.fn(), destroy: vi.fn() })),
      LatLng: vi.fn(function (this: unknown, lat: number, lng: number) {
        Object.assign(this as object, { lat, lng });
      }),
      Marker: vi.fn(() => ({ setMap: vi.fn(), setPosition: vi.fn(), setIcon: vi.fn() })),
      Polyline: polylineCtor.mockImplementation(() => ({
        setMap: vi.fn(),
        setPath: vi.fn(),
        setOptions: vi.fn(),
      })),
      Event: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  };
});

describe("NaverMapSurface — 지도 생성이 늦을 때", () => {
  it("마운트 시점에 이미 있던 노선도 지도가 준비된 뒤 그려진다", async () => {
    const releaseScript = heldScriptLoad();

    render(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 14 }}
        markers={[]}
        polylines={[{ id: "preview", kind: "route", points: [
          { lat: 37.49, lng: 127.02 },
          { lat: 37.56, lng: 126.97 },
        ] }]}
      />,
    );

    // 아직 SDK 가 안 붙었으므로 지도도 선도 없다 — 여기까지는 정상이다.
    expect(polylineCtor).not.toHaveBeenCalled();

    await releaseScript();

    // 🔴 지도가 생긴 뒤에는 **다시 그려져야 한다.** 고치기 전에는 여기서 0건이었다 —
    // 노선 effect 가 `[polylines]` 에만 걸려 있어 지도 준비를 신호로 받지 못했다.
    await waitFor(() => expect(polylineCtor).toHaveBeenCalledTimes(1));
  });
});

// R21-A 추가 지시 ① — 사용자가 지도를 손으로 옮기거나 확대·축소한 뒤에도 버스
// 위치가 갱신될 때마다 카메라가 되돌아가던 결함(사용자 지적). "무엇에 포커스
// 됐는가"(선택된 버스 id)가 안 바뀌면 `setCenter`/`setZoom` 이 다시 불리면 안
// 된다 — 값이 아니라 "옮길 이유가 있는가"를 검사한다.
describe("NaverMapSurface — 카메라는 선택이 바뀔 때만 옮긴다(위치 갱신에 덮이지 않는다, R21-A 추가지시 ①)", () => {
  it("선택은 그대로인데 버스 위치만 바뀌면 setCenter 가 다시 불리지 않는다", async () => {
    const releaseScript = heldScriptLoad();
    const setCenter = vi.fn();
    const setZoom = vi.fn();
    (window as unknown as { naver: { maps: { Map: unknown } } }).naver.maps.Map = vi.fn(() => ({
      setCenter,
      setZoom,
      destroy: vi.fn(),
    }));

    const { rerender } = render(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 15 }}
        markers={[{ id: "1", lat: 37.5, lng: 127, kind: "bus", selected: true }]}
      />,
    );
    await releaseScript();
    await waitFor(() => expect(setCenter).toHaveBeenCalledTimes(1));

    // 선택(id="1")은 그대로인데 위치만 옮겨 왔다 — 실제 폴링으로 들어오는 갱신.
    rerender(
      <NaverMapSurface
        camera={{ lat: 37.55, lng: 127.05, zoom: 15 }}
        markers={[{ id: "1", lat: 37.55, lng: 127.05, kind: "bus", selected: true }]}
      />,
    );

    expect(setCenter).toHaveBeenCalledTimes(1);
    expect(setZoom).toHaveBeenCalledTimes(1);
  });

  it("다른 버스를 선택하면 카메라가 다시 옮겨간다", async () => {
    const releaseScript = heldScriptLoad();
    const setCenter = vi.fn();
    (window as unknown as { naver: { maps: { Map: unknown } } }).naver.maps.Map = vi.fn(() => ({
      setCenter,
      setZoom: vi.fn(),
      destroy: vi.fn(),
    }));

    const { rerender } = render(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 15 }}
        markers={[{ id: "1", lat: 37.5, lng: 127, kind: "bus", selected: true }]}
      />,
    );
    await releaseScript();
    await waitFor(() => expect(setCenter).toHaveBeenCalledTimes(1));

    rerender(
      <NaverMapSurface
        camera={{ lat: 38.0, lng: 128.0, zoom: 15 }}
        markers={[
          { id: "1", lat: 37.5, lng: 127, kind: "bus", selected: false },
          { id: "2", lat: 38.0, lng: 128.0, kind: "bus", selected: true },
        ]}
      />,
    );

    expect(setCenter).toHaveBeenCalledTimes(2);
  });
});

// R21-A 목표 1 — 같은 버스 마커(id 불변)를 다시 골라도 흰 테두리(선택 강조)가
// 반영돼야 한다. 마커 갱신 effect 는 기존 마커를 만나면(`found`) 좌표 보간
// 분기로만 가고 아이콘은 생성 시점 한 번뿐이었다 — 선택 상태가 바뀌어도 아이콘이
// 그대로 남는 결함이 될 수 있어, `setIcon` 이 다시 불리는지 직접 확인한다.
describe("NaverMapSurface — 선택 상태가 바뀌면 기존 마커의 아이콘도 다시 굳힌다(R21-A 목표 1)", () => {
  it("같은 id 의 버스 마커라도 selected 가 바뀌면 setIcon 이 다시 호출된다", async () => {
    const releaseScript = heldScriptLoad();
    const setIcon = vi.fn();
    (window as unknown as { naver: { maps: { Marker: unknown } } }).naver.maps.Marker = vi.fn(() => ({
      setMap: vi.fn(),
      setPosition: vi.fn(),
      setIcon,
    }));

    const { rerender } = render(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 14 }}
        markers={[{ id: "1", lat: 37.5, lng: 127, kind: "bus", selected: false }]}
      />,
    );
    await releaseScript();
    await waitFor(() => expect(setIcon).toHaveBeenCalledTimes(0)); // 생성 시점엔 setIcon 이 아니라 icon 옵션으로 굳힌다.

    rerender(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 14 }}
        markers={[{ id: "1", lat: 37.5, lng: 127, kind: "bus", selected: true }]}
      />,
    );

    await waitFor(() => expect(setIcon).toHaveBeenCalledTimes(1));
    expect(setIcon.mock.calls[0][0].content).toContain("box-shadow");
  });
});
