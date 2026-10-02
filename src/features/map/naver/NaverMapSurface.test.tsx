import { act, fireEvent, render, waitFor } from "@testing-library/react";
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
  onNaverAuthFailure: vi.fn<(listener: () => void) => () => void>(() => () => {}),
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
      // `new` 로 불리는 가짜는 화살표 함수가 아니라 `function` 으로 쓴다 — vitest 4 부터 `Reflect.construct` 로 만들어
      // 화살표 함수는 `is not a constructor` 로 던진다(R47 vitest 5).
      Map: vi.fn(function () { return { setCenter: vi.fn(), setZoom: vi.fn(), destroy: vi.fn() }; }),
      LatLng: vi.fn(function (this: unknown, lat: number, lng: number) {
        Object.assign(this as object, { lat, lng });
      }),
      Marker: vi.fn(function () { return { setMap: vi.fn(), setPosition: vi.fn(), setIcon: vi.fn() }; }),
      Polyline: polylineCtor.mockImplementation(function () { return {
        setMap: vi.fn(),
        setPath: vi.fn(),
        setOptions: vi.fn(),
      }; }),
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

// R35-W1 — 지도 키 인증이 실패하면(서비스 URL 미등록 주소) SDK 가 `window.naver.maps` 를 비운다.
// 카메라·마커·선 effect 가 `window.naver` 만 확인하고 `.maps` 를 읽어 `LatLng` 를 던졌고,
// 화면 전체가 죽었다(2026-09-30 조율자 브라우저 실측). 대체 문구는 `onAuthFailed` 로 화면이 띄운다.
describe("NaverMapSurface — 인증 실패로 SDK 지도 객체가 비워질 때(R35-W1)", () => {
  it("실패 신호 뒤 자료가 바뀌어도 예외 없이 인증 실패만 알린다", async () => {
    const releaseScript = heldScriptLoad();
    const onAuthFailed = vi.fn();
    const props = { camera: { lat: 37.5, lng: 127, zoom: 14 }, onAuthFailed };
    const { rerender } = render(<NaverMapSurface {...props} markers={[]} polylines={[]} />);
    await releaseScript();
    await waitFor(() => expect(window.naver?.maps.Map).toHaveBeenCalledTimes(1));

    // SDK 가 인증 실패를 알리고 `maps` 를 비운다 — 구독한 콜백을 그대로 불러 그 순간을 흉내 낸다.
    (window as unknown as { naver: { maps: unknown } }).naver.maps = null;
    const authFailureListener = onNaverAuthFailure.mock.calls[0][0];
    act(() => authFailureListener());

    expect(onAuthFailed).toHaveBeenCalledTimes(1);
    expect(() =>
      rerender(
        <NaverMapSurface
          {...props}
          markers={[{ id: "1", lat: 37.5, lng: 127, kind: "bus", selected: true }]}
          polylines={[{ id: "r", kind: "planned", points: [{ lat: 37.5, lng: 127 }, { lat: 37.6, lng: 127.1 }] }]}
        />,
      ),
    ).not.toThrow();
  });

  it("적재가 끝났는데 maps 가 이미 비어 있으면 쉬운 안내 문구로 인증 실패를 알린다", async () => {
    const releaseScript = heldScriptLoad();
    const onAuthFailed = vi.fn();
    render(<NaverMapSurface camera={{ lat: 37.5, lng: 127, zoom: 14 }} markers={[]} onAuthFailed={onAuthFailed} />);
    (window as unknown as { naver: { maps: unknown } }).naver.maps = null;
    await releaseScript();

    await waitFor(() => expect(onAuthFailed).toHaveBeenCalledTimes(1));
    expect((onAuthFailed.mock.calls[0][0] as Error).message).toBe("네이버 지도 인증에 실패했다");
  });
});

// R46-KFIXFE(leak K-6) — 정리가 마커·선·보간 루프만 치우고 지도 객체는 남겨, 관제↔대시보드를 오가는 동안
// 화면 이동마다 지도 객체와 타일 DOM 이 SDK 안에 쌓일 수 있었다. 언마운트 때 `destroy()` 를 불러야 한다.
describe("NaverMapSurface — 화면이 사라질 때(K-6)", () => {
  it("만들어 둔 지도 객체를 destroy 한다", async () => {
    const releaseScript = heldScriptLoad();
    const destroy = vi.fn();
    (window as unknown as { naver: { maps: { Map: unknown } } }).naver.maps.Map = vi.fn(function () { return {
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      destroy,
    }; });
    const { unmount } = render(<NaverMapSurface camera={{ lat: 37.5, lng: 127, zoom: 14 }} markers={[]} />);
    await releaseScript();
    await waitFor(() => expect(window.naver?.maps.Map).toHaveBeenCalledTimes(1));
    expect(destroy).not.toHaveBeenCalled();

    unmount();

    expect(destroy).toHaveBeenCalledTimes(1);
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
    (window as unknown as { naver: { maps: { Map: unknown } } }).naver.maps.Map = vi.fn(function () { return {
      setCenter,
      setZoom,
      destroy: vi.fn(),
    }; });

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
    (window as unknown as { naver: { maps: { Map: unknown } } }).naver.maps.Map = vi.fn(function () { return {
      setCenter,
      setZoom: vi.fn(),
      destroy: vi.fn(),
    }; });

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

  // R22 목표 2 — 실시간 위치가 없는 회차(대기·확정·종료)에는 버스 마커가 아예 없다.
  // 포커스 신호가 "선택된 버스 마커" 하나뿐이면 그런 회차를 골라도 카메라가 안 옮겨가고,
  // 노선과 출발지·도착지가 지도 영역 밖에 그려진다(2026-09-20 눈 확인 — "도착" 이 잘렸다).
  it("버스 마커 없이 노선만 새로 생겨도 카메라가 옮겨간다", async () => {
    const releaseScript = heldScriptLoad();
    const setCenter = vi.fn();
    (window as unknown as { naver: { maps: { Map: unknown } } }).naver.maps.Map = vi.fn(function () { return {
      setCenter,
      setZoom: vi.fn(),
      destroy: vi.fn(),
    }; });

    const { rerender } = render(
      <NaverMapSurface camera={{ lat: 37.5, lng: 127, zoom: 12 }} markers={[]} polylines={[]} />,
    );
    await releaseScript();
    await waitFor(() => expect(setCenter).toHaveBeenCalledTimes(1));

    // 대기 회차를 골랐다 — 버스 마커는 없고 예정 경로만 들어온다.
    rerender(
      <NaverMapSurface
        camera={{ lat: 37.53, lng: 127.0, zoom: 15 }}
        markers={[{ id: "origin-1", lat: 37.56, lng: 126.97, kind: "origin" }]}
        polylines={[
          {
            id: "route-1",
            kind: "planned",
            points: [
              { lat: 37.56, lng: 126.97 },
              { lat: 37.49, lng: 127.02 },
            ],
          },
        ]}
      />,
    );

    expect(setCenter).toHaveBeenCalledTimes(2);
  });

  // R23 목표 3 — 아무것도 안 고른 상태에서도 버스가 전부 보여야 한다(사용자 지시).
  // 마커는 화면이 자료를 받은 뒤에야 도착하므로, 지도가 생길 때 한 번 맞춰 놓는 것으로는
  // 늘 빈 화면 기준이 된다 — 마커가 처음 들어온 순간에 다시 맞춰야 한다.
  it("선택이 없어도 버스 마커가 처음 들어오면 카메라를 다시 맞춘다", async () => {
    const releaseScript = heldScriptLoad();
    const setCenter = vi.fn();
    (window as unknown as { naver: { maps: { Map: unknown } } }).naver.maps.Map = vi.fn(function () { return {
      setCenter,
      setZoom: vi.fn(),
      destroy: vi.fn(),
    }; });

    const { rerender } = render(
      <NaverMapSurface camera={{ lat: 37.5, lng: 127, zoom: 12 }} markers={[]} polylines={[]} />,
    );
    await releaseScript();
    await waitFor(() => expect(setCenter).toHaveBeenCalledTimes(1));

    // 폴링이 첫 자료를 물어 왔다 — 고른 버스는 없다.
    rerender(
      <NaverMapSurface
        camera={{ lat: 37.52, lng: 127.0, zoom: 12 }}
        markers={[
          { id: "1", lat: 37.51, lng: 126.91, kind: "bus", busNo: "3호차" },
          { id: "2", lat: 37.47, lng: 127.02, kind: "bus", busNo: "4호차" },
        ]}
        polylines={[]}
      />,
    );

    expect(setCenter).toHaveBeenCalledTimes(2);
  });
});

// R23 목표 4 — 지도 위 버스 아이콘을 눌러 고른다(사용자 지시). SDK 의 마커 이벤트가
// 이 아이콘 형태에서 안 불려(본문 주석 참고) 마커 HTML 의 `data-marker-id` 를 컨테이너에서
// 받는다 — 그래서 시험도 DOM 클릭으로 한다.
describe("NaverMapSurface — 지도 마커 클릭(R23 목표 4)", () => {
  it("data-marker-id 가 붙은 요소를 누르면 그 id 를 넘긴다", async () => {
    const releaseScript = heldScriptLoad();
    const onMarkerClick = vi.fn();

    const { container } = render(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 12 }}
        markers={[{ id: "42", lat: 37.5, lng: 127, kind: "bus", busNo: "3호차" }]}
        onMarkerClick={onMarkerClick}
      />,
    );
    await releaseScript();

    // SDK 가 마커 HTML 을 실제로 심는 자리를 시험에서는 직접 만든다 — 확인 대상은
    // "컨테이너가 그 클릭을 받아 id 를 되찾는가" 이지 SDK 의 삽입 위치가 아니다.
    const mapContainer = container.firstElementChild as HTMLElement;
    const chip = document.createElement("span");
    chip.setAttribute("data-marker-id", "42");
    mapContainer.appendChild(chip);

    chip.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onMarkerClick).toHaveBeenCalledWith("42");
  });

  it("마커가 아닌 곳을 누르면 아무것도 넘기지 않는다", async () => {
    const releaseScript = heldScriptLoad();
    const onMarkerClick = vi.fn();

    const { container } = render(
      <NaverMapSurface camera={{ lat: 37.5, lng: 127, zoom: 12 }} markers={[]} onMarkerClick={onMarkerClick} />,
    );
    await releaseScript();

    const mapContainer = container.firstElementChild as HTMLElement;
    const plain = document.createElement("div");
    mapContainer.appendChild(plain);

    plain.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onMarkerClick).not.toHaveBeenCalled();
  });
});

// R25 목표 1 — 승하차지를 골라 `selected` 가 켜져도 지도에서 아무 변화가 없었다
// (2026-09-20 실측 — 누르기 전·후 둘 다 테두리 부재). 아이콘을 다시 굳히는 분기가
// **버스에만** 걸려 있었기 때문이다.
describe("NaverMapSurface — 선택 강조는 종류를 안 가린다(R25 목표 1)", () => {
  it("승하차지 마커도 selected 가 켜지면 아이콘을 다시 굳힌다", async () => {
    const releaseScript = heldScriptLoad();
    const setIcon = vi.fn();
    (window as unknown as { naver: { maps: { Marker: unknown } } }).naver.maps.Marker = vi.fn(function () { return {
      setMap: vi.fn(),
      setPosition: vi.fn(),
      setIcon,
    }; });

    const { rerender } = render(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 14 }}
        markers={[{ id: "stop-7", lat: 37.5, lng: 127, kind: "stop" }]}
      />,
    );
    await releaseScript();
    await waitFor(() => expect(document.querySelector("div")).toBeTruthy());
    setIcon.mockClear();

    rerender(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 14 }}
        markers={[{ id: "stop-7", lat: 37.5, lng: 127, kind: "stop", selected: true }]}
      />,
    );

    await waitFor(() => expect(setIcon).toHaveBeenCalledTimes(1));
    expect(setIcon.mock.calls[0][0].content).toContain('stroke="#16a34a"');
  });

  // 좌표만 갱신되는 회차(버스 위치는 2초마다 들어온다)에 승하차지 수십 개의 DOM 을
  // 매번 새로 그리면 깜빡인다 — 내용이 같으면 건드리지 않는다.
  it("아이콘 내용이 그대로면 다시 굳히지 않는다", async () => {
    const releaseScript = heldScriptLoad();
    const setIcon = vi.fn();
    (window as unknown as { naver: { maps: { Marker: unknown } } }).naver.maps.Marker = vi.fn(function () { return {
      setMap: vi.fn(),
      setPosition: vi.fn(),
      setIcon,
    }; });

    const { rerender } = render(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 14 }}
        markers={[{ id: "stop-7", lat: 37.5, lng: 127, kind: "stop" }]}
      />,
    );
    await releaseScript();
    setIcon.mockClear();

    // 좌표만 바뀌고 아이콘을 정하는 값(selected·busNo·direction)은 그대로다.
    rerender(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 14 }}
        markers={[{ id: "stop-7", lat: 37.51, lng: 127.01, kind: "stop" }]}
      />,
    );

    expect(setIcon).not.toHaveBeenCalled();
  });
});

// W2-01 — 관제 지도의 비상 강조. 비상은 버스가 이미 지도에 떠 있는 동안 WS 로 들어오므로
// "이미 있는 마커의 아이콘이 바뀐다" 가 주된 경로이고, 비상 중에 화면을 연 경우가 생성 경로다.
describe("NaverMapSurface — 비상 마커 강조(W2-01)", () => {
  const busMarker = { id: "11", lat: 37.5, lng: 127, kind: "bus" as const, busNo: "3호차" };

  it("이미 떠 있던 버스에 emergency 가 켜지면 아이콘을 붉은 테두리로 다시 굳힌다", async () => {
    const releaseScript = heldScriptLoad();
    const setIcon = vi.fn();
    const Marker = vi.fn(function () { return { setMap: vi.fn(), setPosition: vi.fn(), setIcon }; });
    (window as unknown as { naver: { maps: { Marker: unknown } } }).naver.maps.Marker = Marker;
    const camera = { lat: 37.5, lng: 127, zoom: 14 };

    const { rerender } = render(<NaverMapSurface camera={camera} markers={[busMarker]} />);
    await releaseScript();
    await waitFor(() => expect(Marker).toHaveBeenCalled());
    setIcon.mockClear();

    rerender(<NaverMapSurface camera={camera} markers={[{ ...busMarker, emergency: true }]} />);

    await waitFor(() => expect(setIcon).toHaveBeenCalledTimes(1));
    expect(setIcon.mock.calls[0][0].content).toContain("#dc2626");
  });

  it("비상 중에 처음 그려지는 버스도 붉은 테두리로 만들어진다", async () => {
    const releaseScript = heldScriptLoad();
    const Marker = vi.fn(function () { return { setMap: vi.fn(), setPosition: vi.fn(), setIcon: vi.fn() }; });
    (window as unknown as { naver: { maps: { Marker: unknown } } }).naver.maps.Marker = Marker;

    render(
      <NaverMapSurface camera={{ lat: 37.5, lng: 127, zoom: 14 }} markers={[{ ...busMarker, emergency: true }]} />,
    );
    await releaseScript();

    await waitFor(() => expect(Marker).toHaveBeenCalled());
    const options = (Marker.mock.calls as unknown as Array<[{ icon: { content: string } }]>)[0][0];
    expect(options.icon.content).toContain("#dc2626");
  });
});

// R25 목표 2 — 버스를 고르면 그 버스가 정중앙에 온다. 노선 전체를 담는 배율(R22)은
// 8km 노선에서 버스가 점만 해져 "어디 있는지" 를 못 읽는다.
describe("NaverMapSurface — 고른 버스는 정중앙(R25 목표 2)", () => {
  it("고른 버스가 있으면 노선이 있어도 fitBounds 대신 그 좌표로 옮긴다", async () => {
    const releaseScript = heldScriptLoad();
    const setCenter = vi.fn();
    const setZoom = vi.fn();
    const fitBounds = vi.fn();
    (window as unknown as { naver: { maps: { Map: unknown; LatLngBounds: unknown } } }).naver.maps.Map = vi.fn(function () { return {
      setCenter,
      setZoom,
      fitBounds,
      destroy: vi.fn(),
    }; });
    (window as unknown as { naver: { maps: { LatLngBounds: unknown } } }).naver.maps.LatLngBounds = vi.fn();

    render(
      <NaverMapSurface
        camera={{ lat: 37.5, lng: 127, zoom: 16 }}
        markers={[{ id: "1", lat: 37.5, lng: 127, kind: "bus", busNo: "2호차", selected: true }]}
        polylines={[
          {
            id: "route-1",
            kind: "moving",
            points: [
              { lat: 37.56, lng: 126.97 },
              { lat: 37.49, lng: 127.02 },
            ],
          },
        ]}
      />,
    );
    await releaseScript();

    await waitFor(() => expect(setCenter).toHaveBeenCalledTimes(1));
    expect(setZoom).toHaveBeenCalledWith(16);
    expect(fitBounds).not.toHaveBeenCalled();
  });
});

// 2026-09-23 사용자 지시 — 승하차지 자리를 **핀을 마우스로 끌어** 정한다. SDK 의 마커 이벤트는 이 아이콘
// 형태에서 안 불리므로(위 R23 주석) 지도 영역에서 마우스 이벤트를 받아 직접 옮긴다. 시험 SDK 의 투영은
// "화면 1px = 위도·경도 0.001" 로 단순화했다.
describe("NaverMapSurface — 끌 수 있는 마커(2026-09-23)", () => {
  const 투영 = {
    fromCoordToOffset: (coord: { lat: number; lng: number }) => ({ x: coord.lng * 1000, y: coord.lat * 1000 }),
    fromOffsetToCoord: (offset: { x: number; y: number }) => ({
      lat: () => offset.y / 1000,
      lng: () => offset.x / 1000,
    }),
  };

  const 지도를_띄운다 = async (draggable: boolean) => {
    const releaseScript = heldScriptLoad();
    const setOptions = vi.fn();
    const setPosition = vi.fn();
    const naverMaps = (window as unknown as { naver: { maps: Record<string, unknown> } }).naver.maps;
    naverMaps.Map = vi.fn(function () { return {
      setCenter: vi.fn(), setZoom: vi.fn(), destroy: vi.fn(), setOptions, getProjection: () => 투영,
    }; });
    naverMaps.Point = vi.fn(function (this: unknown, x: number, y: number) {
      Object.assign(this as object, { x, y });
    });
    naverMaps.Marker = vi.fn(function () { return { setMap: vi.fn(), setPosition, setIcon: vi.fn() }; });
    const onMarkerDragEnd = vi.fn();
    const onMapClick = vi.fn();
    const { container } = render(
      <NaverMapSurface
        camera={{ lat: 0.2, lng: 0.1, zoom: 18 }}
        markers={[{ id: "draft", lat: 0.2, lng: 0.1, kind: "stop", draggable }]}
        onMarkerDragEnd={onMarkerDragEnd}
        onMapClick={onMapClick}
      />,
    );
    await releaseScript();
    await waitFor(() => expect(naverMaps.Marker).toHaveBeenCalled());
    // 시험 SDK 는 아이콘 HTML 을 DOM 에 넣지 않는다 — 실제 SDK 가 하듯 지도 영역 안에 붙인다.
    const surface = container.firstElementChild as HTMLElement;
    surface.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
    const pin = document.createElement("span");
    pin.setAttribute("data-marker-id", "draft");
    surface.appendChild(pin);
    return { pin, surface, setOptions, setPosition, onMarkerDragEnd, onMapClick };
  };

  it("핀을 잡고 끌어 놓으면 잡은 자리만큼 어긋남 없이 새 좌표를 알린다", async () => {
    const { pin, setOptions, setPosition, onMarkerDragEnd, onMapClick } = await 지도를_띄운다(true);

    // 핀 끝(좌표 0.2, 0.1 → 화면 100, 200)보다 20px 위의 머리를 잡는다.
    fireEvent.mouseDown(pin, { clientX: 100, clientY: 180, button: 0 });
    fireEvent.mouseMove(window, { clientX: 130, clientY: 230 });
    fireEvent.mouseUp(window, { clientX: 130, clientY: 230 });
    fireEvent.click(pin, { clientX: 130, clientY: 230 });

    // 머리를 잡은 채 (30, 50) 옮겼으니 끝도 (130, 250) — 잡은 자리를 좌표로 쓰면 20px 어긋난다.
    expect(onMarkerDragEnd).toHaveBeenCalledWith("draft", { lat: 0.25, lng: 0.13 });
    expect(setPosition).toHaveBeenCalled();
    expect(setOptions).toHaveBeenCalledWith("draggable", false);
    expect(setOptions).toHaveBeenLastCalledWith("draggable", true);
    expect(onMapClick).not.toHaveBeenCalled();
  });

  it("끌 수 없는 마커는 잡아도 움직이지 않는다", async () => {
    const { pin, onMarkerDragEnd } = await 지도를_띄운다(false);

    fireEvent.mouseDown(pin, { clientX: 100, clientY: 180, button: 0 });
    fireEvent.mouseMove(window, { clientX: 130, clientY: 230 });
    fireEvent.mouseUp(window, { clientX: 130, clientY: 230 });

    expect(onMarkerDragEnd).not.toHaveBeenCalled();
  });
});
