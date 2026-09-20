// R23 목표 4 — 버스를 고르면 **그 버스와 그 노선만** 지도에 남긴다(사용자 지시).
// 여러 대가 동시에 움직이면 고른 버스의 경로가 다른 버스 마커에 가려 읽히지 않는다.
//
// 세 화면(MonitoringPage·DashboardPage·TodayRunPage)이 같은 규칙을 써야 하므로
// `features/map` 표면에 둔다 — 화면마다 복사하면 한쪽만 고쳐지는 사본이 생긴다
// (`buildRouteDisplayState`·`anchorForSelection` 과 같은 근거).
import type { MapMarker } from "./types";

/**
 * 지도에 실제로 그릴 마커를 고른다.
 *
 * @param busMarkers 실시간 위치가 있는 회차 전부
 * @param routeMarkers 고른 회차의 승하차지·출발지·도착지 — 호출부가 고른 회차 것만 담아 넘긴다
 * @param selectedBusId 고른 회차의 마커 id(= 회차 id 문자열). 선택이 없으면 `null`
 * @return 선택이 없으면 버스 전부, 있으면 **그 버스 하나 + 그 노선의 마커**
 */
export const visibleMarkers = (
  busMarkers: MapMarker[],
  routeMarkers: MapMarker[],
  selectedBusId: string | null,
): MapMarker[] => {
  if (selectedBusId == null) return [...busMarkers, ...routeMarkers];
  // 고른 회차에 실시간 위치가 없을 수 있다(대기·확정·종료) — 그때는 버스 마커가 아예 없고
  // 노선 마커만 남는다. 빈 배열을 특별히 다루지 않아도 그 형태가 그대로 나온다.
  return [...busMarkers.filter((marker) => marker.id === selectedBusId), ...routeMarkers];
};
