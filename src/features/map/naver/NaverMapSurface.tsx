"use client";

// 네이버 지도 SDK(`naver.maps.*`)를 직접 참조하는 유일한 파일 — `IMPLEMENTATION_PLAN.md
// §8.3.1` 이 요구하는 포트/어댑터 경계다. 화면(features/admin·features/run)은 이 파일을
// 몰라야 하고, 대신 한 단계 위의 `../MapSurface` 만 가져다 쓴다. 이 경계는
// `features/map/mapAdapterBoundary.test.ts` 가 파일 스캔으로 강제한다.
import { useEffect, useRef } from "react";
import type { MapCamera, MapMarker, MapMarkerKind } from "../types";
import { getNaverMapClientId } from "./naverMapConfig";
import { loadNaverMapsScript, onNaverAuthFailure } from "./loadNaverMapsScript";
import { MarkerAnimationController } from "./markerAnimationController";
import type { LatLng } from "./markerInterpolation";

export type NaverMapSurfaceProps = {
  camera: MapCamera;
  markers: MapMarker[];
  onReady?: () => void;
  onAuthFailed?: (exception: unknown) => void;
  className?: string;
};

// 마커 종류별 표시색 — 아이콘 이미지 자산이 아직 없어(디자인 시스템에 부재,
// 보고서 §1) 기본 핀 색상으로만 구분한다.
const MARKER_COLOR: Record<MapMarkerKind, string> = {
  bus: "#2563eb",
  stop: "#16a34a",
  student: "#f97316",
};

export const NaverMapSurface = ({ camera, markers, onReady, onAuthFailed, className }: NaverMapSurfaceProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markerRefs = useRef<Map<string, naver.maps.Marker>>(new Map());
  // 마커별로 "지금 실제 화면에 반영된 좌표" — 애니메이션 진행 중에는 목표 좌표가
  // 아니라 이 값이 다음 보간의 출발점이 된다(이어붙이기, COMMON-B2 §2).
  const displayedPositions = useRef<Map<string, LatLng>>(new Map());
  // 보간 스케줄링 — SDK 를 모르는 순수 컨트롤러라 여기서만 `naver.maps.LatLng` 로
  // 감싸 실제 마커에 반영한다. 마커를 움직이는 것이지 카메라를 움직이는 것이
  // 아니다 — 카메라는 아래 별도 useEffect 가 즉시(보간 없이) 갱신한다.
  const animationControllerRef = useRef<MarkerAnimationController | null>(null);
  if (animationControllerRef.current == null) {
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
        onReady?.();
      })
      .catch((error: unknown) => {
        if (!cancelled) onAuthFailed?.(error);
      });

    return () => {
      cancelled = true;
      unsubscribeAuthFailure();
      // ⚠ 화면이 사라질 때 보간 프레임 루프를 반드시 멈춘다 — 안 멈추면 언마운트된
      // 컴포넌트를 향해 계속 `requestAnimationFrame` 이 도는 누수가 된다.
      animationControllerRef.current?.dispose();
      displayedPositions.current.clear();
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current.clear();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카메라 갱신 — 지도 생성 이후의 `camera` 변경을 반영한다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.naver) return;
    map.setCenter(new window.naver.maps.LatLng(camera.lat, camera.lng));
    map.setZoom(camera.zoom);
  }, [camera.lat, camera.lng, camera.zoom]);

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
          icon: {
            content: `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${MARKER_COLOR[markerData.kind]};border:2px solid #fff;"></span>`,
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
        animationControllerRef.current?.receive(markerData.id, { lat: markerData.lat, lng: markerData.lng });
      } else {
        found.setPosition(new naverMaps.LatLng(markerData.lat, markerData.lng));
        displayedPositions.current.set(markerData.id, { lat: markerData.lat, lng: markerData.lng });
      }
    }
  }, [markers]);

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
};
