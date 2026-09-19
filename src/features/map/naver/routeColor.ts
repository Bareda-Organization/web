// R20-C 목표 3 — 노선 색도 상태별로 다르게(사용자 지시). `StatusPill`(shared/ui)이
// 쓰는 상태-색 매핑과 같은 값을 쓴다(semantic.css `--status-boarded`·`--status-moving`·
// `--status-missed`) — 같은 회차가 목록 태그와 지도 위 선에서 같은 색으로 보이게
// 한다. naver.maps.Polyline 이 실제 hex 문자열만 받아 CSS 변수 대신 값을 그대로
// 박아 둔다(마커 색 — markerIcon.tsx — 와 같은 제약). `markerIcon.tsx` 와 마찬가지로
// SDK 없이도 시험하기 위해 순수 함수로 뗀다.
import type { MapPolylineKind } from "../types";

const ROUTE_COLOR: Record<MapPolylineKind, string> = {
  route: "#2563eb", // 기존 색 그대로 — features/approval(B) 의 전/후 미리보기가 이 값을 쓴다.
  moving: "#C77E12", // --amber-ink, --status-moving
  finished: "#1F5C4D", // --green-600, --status-boarded
  confirmed: "#C93F2C", // --red-ink, --status-missed
  // Ruling 321 — 예정(고정 노선 기반) 경로. 확정 경로 3종과 헷갈리지 않도록
  // 상태색이 아닌 스톤(회색)을 쓴다 — "아직 확정 안 됨"을 색으로도 알린다.
  planned: "#6B7672", // --stone-500
};

export const routeColorFor = (kind: MapPolylineKind): string => ROUTE_COLOR[kind];
