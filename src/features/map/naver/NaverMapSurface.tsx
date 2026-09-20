"use client";

// 네이버 지도 SDK(`naver.maps.*`)를 직접 참조하는 유일한 파일 — `IMPLEMENTATION_PLAN.md
// §8.3.1` 이 요구하는 포트/어댑터 경계다. 화면(features/admin·features/run)은 이 파일을
// 몰라야 하고, 대신 한 단계 위의 `../MapSurface` 만 가져다 쓴다. 이 경계는
// `features/map/mapAdapterBoundary.test.ts` 가 파일 스캔으로 강제한다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapCamera, MapMarker, MapPolyline } from "../types";
import { getNaverMapClientId } from "./naverMapConfig";
import { loadNaverMapsScript, onNaverAuthFailure } from "./loadNaverMapsScript";
import { MarkerAnimationController } from "./markerAnimationController";
import { buildMarkerIconHtml } from "./markerIcon";
import type { LatLng } from "./markerInterpolation";
import { routeColorFor } from "./routeColor";

export type NaverMapSurfaceProps = {
  camera: MapCamera;
  markers: MapMarker[];
  polylines?: MapPolyline[];
  // R23 목표 4 — 지도 위 버스 아이콘을 눌러 고른다(사용자 지시). 인자는 `MapMarker.id` 이고,
  // 버스 마커의 id 는 회차 id 문자열이다(세 화면이 그렇게 만든다).
  onMarkerClick?: (markerId: string) => void;
  onReady?: () => void;
  onAuthFailed?: (exception: unknown) => void;
  className?: string;
};

export const NaverMapSurface = ({
  camera,
  markers,
  polylines = [],
  onMarkerClick,
  onReady,
  onAuthFailed,
  className,
}: NaverMapSurfaceProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, naver.maps.Marker>>(new Map());
  // R15-T2 — 선택된 노선. 마커와 달리 보간 대상이 아니다(경로는 한 번에 통째로 그린다).
  const polylineRefs = useRef<Map<string, naver.maps.Polyline>>(new Map());
  // ⚠ 지도 생성은 SDK 적재를 기다리는 **비동기**라, 마운트 직후에는 `mapRef.current` 가
  // 아직 `null` 이다. 아래 세 effect(카메라·마커·노선)는 그때 일찍 반환하는데,
  // 그 뒤 의존성이 안 바뀌면 **다시 실행되지 않는다.** 자료를 비동기로 받는 화면은
  // 상태가 뒤늦게 바뀌어 우연히 동작했지만, **자료를 이미 들고 마운트하는 화면**
  // (구간변경 승인 상세)은 그 한 번의 이른 실행이 전부여서 지도 타일만 뜨고
  // 경로 선이 영영 안 그려졌다(2026-09-19 사용자 지적 → 실제 브라우저로 재현).
  // ⇒ **지도가 생긴 사실 자체를 신호로 만들어** 세 effect 가 다시 돌게 한다.
  const [mapReady, setMapReady] = useState(false);
  // 마커별로 "지금 실제 화면에 반영된 좌표" — 애니메이션 진행 중에는 목표 좌표가
  // 아니라 이 값이 다음 보간의 출발점이 된다(이어붙이기, COMMON-B2 §2).
  const displayedPositions = useRef<Map<string, LatLng>>(new Map());
  // R25 목표 1 — 마커별로 "지금 화면에 반영된 아이콘 HTML". 달라졌을 때만 다시 굳힌다.
  const renderedIcons = useRef<Map<string, string>>(new Map());
  // 보간 스케줄링 — SDK 를 모르는 순수 컨트롤러라 여기서만 `naver.maps.LatLng` 로
  // 감싸 실제 마커에 반영한다. 마커를 움직이는 것이지 카메라를 움직이는 것이
  // 아니다 — 카메라는 아래 별도 useEffect 가 즉시(보간 없이) 갱신한다.
  // react.dev 가 명시적으로 허용하는 "비용이 드는 객체를 ref 에 지연 생성" 관용구
  // (https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents)
  // — `if (ref.current === null)` 로 감싸 마운트당 정확히 한 번만 만들고, 그 뒤
  // 어떤 렌더에서도 다시 실행되지 않는다. `useState` 지연 초기화로 바꿔 봤으나
  // 그 초기화 함수 안에서 다른 ref(`displayedPositions`·`markerRefs`)를 읽는
  // 클로저를 만든다는 이유로 `react-hooks/refs` 가 여전히 같은 성질의 오류를
  // 냈다(클로저 정의 시점과 호출 시점을 정적으로 구분하지 못함) — 즉 이 검사
  // 규칙이 애초에 "마운트 시 1회, 그 뒤 불변"이라는 이 패턴 자체를 지원하지
  // 않는다. 동작을 바꾸는 대안(매 렌더 재생성 등)은 목표 5의 "동작 변경 없음"
  // 을 어기므로, 원래 형태를 유지하고 이 한 줄만 억제한다(보고서 §1).
  const animationControllerRef = useRef<MarkerAnimationController | null>(null);
  if (animationControllerRef.current == null) {
    // 지연 초기화라 안전하다(위 주석 참고). react.dev 문서가 이 형태를 직접 예시로 든다.
    // eslint-disable-next-line react-hooks/refs -- 마운트당 1회만 도는 안전한 지연 초기화
    animationControllerRef.current = new MarkerAnimationController({
      applyPosition: (id, position) => {
        displayedPositions.current.set(id, position);
        const marker = markerRefs.current.get(id);
        const naverMaps = window.naver?.maps;
        if (marker && naverMaps) {
          marker.setPosition(new naverMaps.LatLng(position.lat, position.lng));
        }
      },
      getCurrentPosition: (id) => displayedPositions.current.get(id),
    });
  }

  // SDK 적재 + 지도 생성 — 마운트 시 한 번만.
  useEffect(() => {
    let cancelled = false;
    const clientId = getNaverMapClientId();
    if (!clientId) {
      onAuthFailed?.(new Error("네이버 지도 클라이언트 키가 설정되지 않았다"));
      return;
    }

    const unsubscribeAuthFailure = onNaverAuthFailure(() => {
      // SDK 는 인증 실패 신호만 주고 원인 값을 넘기지 않는다(보고서 §1·§2) —
      // 고정된 계약 형태(`onAuthFailed(exception)`)를 지키기 위해 여기서
      // `Error` 를 만들어 전달한다.
      onAuthFailed?.(new Error("네이버 지도 인증에 실패했다"));
    });

    loadNaverMapsScript(clientId)
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const map = new window.naver!.maps.Map(containerRef.current, {
          center: new window.naver!.maps.LatLng(camera.lat, camera.lng),
          zoom: camera.zoom,
        });
        mapRef.current = map;
        setMapReady(true);
        onReady?.();
      })
      .catch((error: unknown) => {
        if (!cancelled) onAuthFailed?.(error);
      });

    // cleanup 시점에 `.current` 를 다시 읽지 않고 이 순간(effect 실행 시점, 곧
    // 마운트 시점)의 참조를 캡처해 둔다 — 이 두 ref 는 코드 전체에서
    // `.current = new Map()` 로 재대입되는 곳이 없고 내용만 바뀌므로, 마운트
    // 때 잡은 참조가 언마운트 때까지 항상 같은 객체를 가리킨다. `.current` 를
    // 직접 참조하는 클린업에 대한 `react-hooks/exhaustive-deps` 경고("클린업이
    // 돌 때는 다른 값일 수 있다")는 이 지역 변수 캡처로 해소된다(동작 변경 없음).
    const displayedPositionsAtMount = displayedPositions.current;
    const markerRefsAtMount = markerRefs.current;
    const polylineRefsAtMount = polylineRefs.current;

    return () => {
      cancelled = true;
      unsubscribeAuthFailure();
      // ⚠ 화면이 사라질 때 보간 프레임 루프를 반드시 멈춘다 — 안 멈추면 언마운트된
      // 컴포넌트를 향해 계속 `requestAnimationFrame` 이 도는 누수가 된다.
      animationControllerRef.current?.dispose();
      displayedPositionsAtMount.clear();
      markerRefsAtMount.forEach((marker) => marker.setMap(null));
      markerRefsAtMount.clear();
      polylineRefsAtMount.forEach((line) => line.setMap(null));
      polylineRefsAtMount.clear();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // R21-A 추가 지시 ① — 예전엔 `camera` 좌표가 바뀔 때마다(버스 위치가 갱신될
  // 때마다) 이 effect 가 다시 돌아 `setCenter`/`setZoom` 을 불렀다 — 사용자가
  // 이미 지도를 손으로 옮기거나 확대·축소해 둔 상태를 위치 갱신이 덮어써
  // "간헐적으로 리셋된다"는 신고로 이어졌다(운행 중 회차만 위치가 계속 들어와
  // 간헐적으로 보였다). `camera` 값 자체를 비교해 막으면 같은 좌표로 다시 와도
  // 되돌아가는 문제가 남으므로, **무엇 때문에 카메라를 옮기려는가**(선택된 버스
  // id, 또는 선택 없음)를 신호로 삼는다 — 이 값은 위치가 갱신돼도 안 바뀐다.
  // R22 목표 2 — 노선도 포커스 대상이다. 예전엔 "선택된 버스 마커" 하나만 신호라,
  // 실시간 위치가 없는 회차(대기·확정·종료)를 고르면 버스 마커 자체가 없어 focusKey 가
  // "none" 에 머물렀다 — 화면이 계산해 넘긴 카메라(`anchorForSelection`, R21-A 목표 4)가
  // 있어도 이 effect 가 다시 안 돌아 지도가 기본 좌표에 그대로 있었고, 노선과 출발지·
  // 도착지가 지도 영역 밖에 그려졌다(2026-09-20 눈 확인 — "도착" 이 지도 아래로 잘림).
  // R23 목표 3 — 아무것도 안 고른 상태에서도 버스가 전부 보여야 한다(사용자 지시). 마커가
  // 처음 도착하는 순간(빈 배열 → 여러 대)에 한 번 포커스 신호가 바뀌게 해서 그때 전체를
  // 담는 배율로 맞춘다. 그 뒤 위치가 갱신돼도 이 값은 `"all-markers"` 로 고정이라 카메라가
  // 되돌아가지 않는다 — R21-A 가 막은 "지도가 간헐적으로 리셋된다" 를 그대로 지킨다.
  const focusKey = useMemo(() => {
    const selectedBusId = markers.find((marker) => marker.kind === "bus" && marker.selected)?.id;
    if (selectedBusId) return selectedBusId;
    // 빈 배열의 join 은 `""` 라 `??` 로는 안 걸러진다 — 빈 문자열도 "포커스 없음" 이다.
    const routeKey = polylines.map((polyline) => polyline.id).join(",");
    if (routeKey) return routeKey;
    return markers.length > 0 ? "all-markers" : "none";
  }, [markers, polylines]);
  // focusKey 가 안 바뀌면 아래 effect 가 재실행되지 않으므로, 그 사이에 갱신된
  // 최신 `camera` 값은 이 ref 로 읽는다(effect 의존성에 넣지 않는다 — 그러면
  // 다시 좌표 비교 문제로 돌아간다).
  const cameraRef = useRef(camera);
  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => {
    cameraRef.current = camera;
    onMarkerClickRef.current = onMarkerClick;
  });

  // R22 목표 2 — 노선이 그려져 있으면 고정 배율(`SELECTED_BUS_MAP_ZOOM` = 15) 대신
  // 노선 전체가 들어오는 배율로 맞춘다. 고정 15 는 시드 정차지 4곳(대각선 426m)을 보고
  // 정한 값이라, 승차지→학원처럼 8km 를 넘는 실제 노선에서는 한쪽 끝이 지도 밖으로
  // 나간다 — 출발지·도착지를 마커로 찍어도 화면에 안 보이면 안 찍은 것과 같다.
  //
  // ⚠ `LatLngBounds`·`fitBounds` 가 없으면 예전 방식으로 되돌린다. 없는 경우가 실제로
  // 있다 — 이 파일의 시험이 SDK 를 "이 컴포넌트가 부르는 것만" 흉내 내기 때문이다.
  // 던지면 뒤따르는 마커·노선 effect 까지 멈춘다(위 Map 모의 주석과 같은 사고).
  const fitToPoints = (map: naver.maps.Map, points: { lat: number; lng: number }[]): boolean => {
    const naverMaps = window.naver?.maps as (typeof naver.maps & { LatLngBounds?: unknown }) | undefined;
    if (!naverMaps?.LatLngBounds || typeof map.fitBounds !== "function" || points.length < 2) return false;
    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    map.fitBounds(
      new naverMaps.LatLngBounds(
        new naverMaps.LatLng(Math.min(...lats), Math.min(...lngs)),
        new naverMaps.LatLng(Math.max(...lats), Math.max(...lngs)),
      ),
    );
    return true;
  };

  // R23 목표 4 — 지도 위 마커 클릭. **SDK 의 마커 이벤트를 쓰지 않는다.**
  // `naver.maps.Event.addListener(marker, "click", …)` 를 먼저 썼으나 이 아이콘 형태
  // (`icon.content` 만 주고 `size` 는 생략한 HTML 아이콘)에서는 한 번도 안 불렸다
  // (2026-09-20 실측 — 실제 마우스 클릭·합성 이벤트 전부). 마커 HTML 에 직접 박은
  // `data-marker-id` 를 컨테이너에서 받는 편이 SDK 판정에 기대지 않아 확실하다.
  //
  // 갈무리 단계(capture)에서 받는 이유 — 지도 자신의 드래그·클릭 처리가 이벤트를
  // 먼저 삼킬 수 있다. 마커를 눌렀는지만 보고 나머지는 그대로 흘려보낸다.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const markerId = target?.closest?.("[data-marker-id]")?.getAttribute("data-marker-id");
      if (markerId) onMarkerClickRef.current?.(markerId);
    };
    container.addEventListener("click", handleClick, true);
    return () => container.removeEventListener("click", handleClick, true);
  }, []);

  // 카메라 갱신 — 지도 생성 시 1회(`Ruling 322`) + 포커스 대상이 바뀔 때만 옮긴다.
  // 같은 버스를 계속 보고 있는 동안의 위치 갱신은 여기에 안 걸린다(위 focusKey 참고).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.naver) return;
    // R25 목표 2 — **버스를 고르면 그 버스를 정중앙에 놓는다**(사용자 지시). 노선 전체를
    // 담는 배율(R22 목표 2)은 고른 버스가 화면 어디에 있는지 알기 어려웠다 — 노선이 8km 를
    // 넘으면 버스가 점만 해진다. 고른 버스가 있으면 화면이 넘긴 `camera`(그 버스 좌표 +
    // `SELECTED_BUS_MAP_ZOOM`)를 그대로 쓰고 아래 fitBounds 를 건너뛴다.
    //
    // 실시간 위치가 없는 회차(대기·확정·종료)는 버스 마커 자체가 없다 — 그때는 예전처럼
    // 노선 전체를 담아야 출발지·도착지가 화면 안에 들어온다(R22 가 고친 그 결함).
    const hasSelectedBus = markers.some((marker) => marker.kind === "bus" && marker.selected);
    if (!hasSelectedBus) {
      // 고른 노선이 있으면 그 노선 전체, 없으면 지금 보이는 버스 전체를 담는다.
      if (fitToPoints(map, polylines.flatMap((polyline) => polyline.points))) return;
      if (fitToPoints(map, markers.filter((marker) => marker.kind === "bus"))) return;
    }
    const cam = cameraRef.current;
    map.setCenter(new window.naver.maps.LatLng(cam.lat, cam.lng));
    map.setZoom(cam.zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fitToPoints 는 매 렌더 새로 만들어지는 지역 함수라 의존성에 넣으면 카메라가 매번 되돌아간다(위 focusKey 주석의 바로 그 결함)
  }, [focusKey, mapReady]);

  // 마커 갱신 — id 기준으로 추가·제거하고, 기존 마커의 좌표 변경은 보간
  // 컨트롤러에 맡긴다(즉시 `setPosition` 하지 않는다 — COMMON-B2 §2).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.naver) return;
    const naverMaps = window.naver.maps;
    const existing = markerRefs.current;
    const nextIds = new Set(markers.map((marker) => marker.id));

    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        existing.delete(id);
        displayedPositions.current.delete(id);
        renderedIcons.current.delete(id);
        animationControllerRef.current?.forget(id);
      }
    }

    for (const markerData of markers) {
      const found = existing.get(markerData.id);
      if (!found) {
        // 새로 나타난 마커 — 보간 없이 바로 그 자리에 놓는다. "받은 간격만큼
        // 편다"는 *갱신*에만 해당하고, 첫 등장은 보간할 이전 위치가 없다.
        const position = new naverMaps.LatLng(markerData.lat, markerData.lng);
        const iconContent = buildMarkerIconHtml(markerData.kind, {
          selected: markerData.selected,
          busNo: markerData.busNo,
          direction: markerData.direction,
          markerId: markerData.id,
        });
        const created = new naverMaps.Marker({
          map,
          position,
          // R18-B 목표 1 — 종류별 크기는 markerIcon.ts 가 정한다(버스가 가장 크다).
          // R21-A 목표 1~3 — 선택 강조·번호·등원하원 모양도 같은 함수가 정한다.
          icon: { content: iconContent },
        });
        existing.set(markerData.id, created);
        renderedIcons.current.set(markerData.id, iconContent);
        displayedPositions.current.set(markerData.id, { lat: markerData.lat, lng: markerData.lng });
        continue;
      }
      // R25 목표 1 — **종류를 가리지 않고** 아이콘을 다시 굳힌다. 예전엔 버스만 갱신해서
      // (R21-A 가 버스 선택 강조만 보고 고친 자리), 승하차지를 골라 `selected` 를 켜도
      // 생성 시점의 아이콘이 그대로 남아 지도에서는 아무 변화가 없었다(2026-09-20 실측 —
      // 누르기 전·후 둘 다 `box-shadow` 부재).
      //
      // 매번 `setIcon` 하지 않고 **내용이 달라졌을 때만** 부른다 — 버스 위치가 2초마다
      // 들어오면 이 effect 도 2초마다 도는데, 그때마다 승하차지 수십 개의 DOM 을 새로
      // 그리면 깜빡인다.
      const content = buildMarkerIconHtml(markerData.kind, {
        selected: markerData.selected,
        busNo: markerData.busNo,
        direction: markerData.direction,
        markerId: markerData.id,
      });
      if (renderedIcons.current.get(markerData.id) !== content) {
        found.setIcon({ content });
        renderedIcons.current.set(markerData.id, content);
      }
      // 버스만 보간 대상이다 — 승하차지·학생은 이 화면에서 좌표가 바뀌지 않는다.
      if (markerData.kind === "bus") {
        animationControllerRef.current?.receive(markerData.id, { lat: markerData.lat, lng: markerData.lng });
      } else {
        found.setPosition(new naverMaps.LatLng(markerData.lat, markerData.lng));
        displayedPositions.current.set(markerData.id, { lat: markerData.lat, lng: markerData.lng });
      }
    }
  }, [markers, mapReady]);

  // 노선 갱신 — id 기준으로 추가·제거한다. 경로 좌표는 선택이 바뀔 때만 통째로
  // 새로 오므로(보간 대상 아님) 기존 id 가 남아 있으면 경로만 다시 그린다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.naver) return;
    const naverMaps = window.naver.maps;
    const existing = polylineRefs.current;
    const nextIds = new Set(polylines.map((polyline) => polyline.id));

    for (const [id, line] of existing) {
      if (!nextIds.has(id)) {
        line.setMap(null);
        existing.delete(id);
      }
    }

    for (const polylineData of polylines) {
      const path = polylineData.points.map((point) => new naverMaps.LatLng(point.lat, point.lng));
      // R20-C 목표 3·5 — 상태별 색(routeColor.ts)과, 근사 경로(직선 보간)는 대시
      // 선으로 선 자체가 알린다(안내문을 지도 밖 아래에 작게 두면 못 본다).
      const strokeColor = routeColorFor(polylineData.kind);
      const strokeStyle: naver.maps.StrokeStyleType = polylineData.approximate ? "shortdash" : "solid";
      const found = existing.get(polylineData.id);
      if (found) {
        found.setPath(path);
        // `PolylineOptions` 오버로드는 `path` 까지 요구해 부분 갱신이 안 된다 —
        // key/value 오버로드로 색·스타일만 바꾼다.
        found.setOptions("strokeColor", strokeColor);
        found.setOptions("strokeStyle", strokeStyle);
        continue;
      }
      const created = new naverMaps.Polyline({
        map,
        path,
        strokeColor,
        strokeStyle,
        strokeWeight: 4,
        strokeOpacity: 0.85,
      });
      existing.set(polylineData.id, created);
    }
  }, [polylines, mapReady]);

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
};
