"use client";

// 네이버 지도 SDK(`naver.maps.*`)를 직접 참조하는 유일한 파일 — `IMPLEMENTATION_PLAN.md
// §8.3.1` 이 요구하는 포트/어댑터 경계다. 화면(features/admin·features/run)은 이 파일을
// 몰라야 하고, 대신 한 단계 위의 `../MapSurface` 만 가져다 쓴다. 이 경계는
// `features/map/mapAdapterBoundary.test.ts` 가 파일 스캔으로 강제한다.
import { useEffect, useRef } from "react";
import type { MapCamera, MapMarker, MapMarkerKind } from "../types";
import { getNaverMapClientId } from "./naverMapConfig";
import { loadNaverMapsScript, onNaverAuthFailure } from "./loadNaverMapsScript";

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

  // 마커 갱신 — id 기준으로 추가·이동·제거한다.
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
      }
    }

    for (const markerData of markers) {
      const position = new naverMaps.LatLng(markerData.lat, markerData.lng);
      const found = existing.get(markerData.id);
      if (found) {
        found.setPosition(position);
        continue;
      }
      const created = new naverMaps.Marker({
        map,
        position,
        icon: {
          content: `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${MARKER_COLOR[markerData.kind]};border:2px solid #fff;"></span>`,
        },
      });
      existing.set(markerData.id, created);
    }
  }, [markers]);

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />;
};
