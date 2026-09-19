"use client";

// 네이버 지도 SDK(`naver.maps.*`)를 직접 참조하는 유일한 파일 — `IMPLEMENTATION_PLAN.md
// §8.3.1` 이 요구하는 포트/어댑터 경계다. 화면(features/admin·features/run)은 이 파일을
// 몰라야 하고, 대신 한 단계 위의 `../MapSurface` 만 가져다 쓴다. 이 경계는
// `features/map/mapAdapterBoundary.test.ts` 가 파일 스캔으로 강제한다.
import { useEffect, useRef, useState } from "react";
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
  onReady?: () => void;
  onAuthFailed?: (exception: unknown) => void;
  className?: string;
};

export const NaverMapSurface = ({
  camera,
  markers,
  polylines = [],
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

  // 카메라 갱신 — 지도 생성 이후의 `camera` 변경을 반영한다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.naver) return;
    map.setCenter(new window.naver.maps.LatLng(camera.lat, camera.lng));
    map.setZoom(camera.zoom);
  }, [camera.lat, camera.lng, camera.zoom, mapReady]);

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
        animationControllerRef.current?.forget(id);
      }
    }

    for (const markerData of markers) {
      const found = existing.get(markerData.id);
      if (!found) {
        // 새로 나타난 마커 — 보간 없이 바로 그 자리에 놓는다. "받은 간격만큼
        // 편다"는 *갱신*에만 해당하고, 첫 등장은 보간할 이전 위치가 없다.
        const position = new naverMaps.LatLng(markerData.lat, markerData.lng);
        const created = new naverMaps.Marker({
          map,
          position,
          // R18-B 목표 1 — 종류별 크기는 markerIcon.ts 가 정한다(버스가 가장 크다).
          // R21-A 목표 1~3 — 선택 강조·번호·등원하원 모양도 같은 함수가 정한다.
          icon: {
            content: buildMarkerIconHtml(markerData.kind, {
              selected: markerData.selected,
              busNo: markerData.busNo,
              direction: markerData.direction,
            }),
          },
        });
        existing.set(markerData.id, created);
        displayedPositions.current.set(markerData.id, { lat: markerData.lat, lng: markerData.lng });
        continue;
      }
      // 버스만 보간 대상이다 — 정류장·학생 마커는 이 화면에서 좌표가 바뀌지
      // 않지만(현재는 항상 kind: "bus" 만 갱신됨), 앞으로 다른 종류가 움직이게
      // 되더라도 목표 5는 "버스 마커 보간" 이므로 범위를 명확히 해 둔다.
      if (markerData.kind === "bus") {
        // R21-A 목표 1 — 좌표는 그대로인 채 선택 상태만 바뀔 수 있다(같은 버스를
        // 고르고 해제할 때 id 가 안 바뀐다) — 아이콘은 매번 다시 굳혀 반영한다.
        found.setIcon({
          content: buildMarkerIconHtml(markerData.kind, {
            selected: markerData.selected,
            busNo: markerData.busNo,
            direction: markerData.direction,
          }),
        });
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
