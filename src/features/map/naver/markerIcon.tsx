// 마커 아이콘 — 이미지 자산이 아직 없어(디자인 시스템에 부재, 보고서 §1) 색과
// 크기만으로 종류를 구별하는 원 핀을 그린다. `NaverMapSurface.tsx` 에서 이 순수
// 함수만 떼어 둔 이유는 SDK(`naver.maps.*`) 없이도 크기 관계를 시험하기 위해서다.
import { renderToStaticMarkup } from "react-dom/server";
import { Bus, BusFront } from "lucide-react";
import type { MapMarkerDirection, MapMarkerKind } from "../types";

const MARKER_COLOR: Record<MapMarkerKind, string> = {
  bus: "#2563eb",
  stop: "#16a34a",
  student: "#f97316",
  // R22 목표 2 — 출발지·도착지. 디자인 시스템 팔레트의 `--stone-800` 을 그대로 쓴다
  // (버스 파랑 · 정차지 초록 · 학생 주황 어디와도 안 겹치고, C-09 상태 4색도 아니라
  // "상태를 뜻하는 색"으로 오인될 여지가 없다).
  origin: "#2A312E",
  destination: "#2A312E",
};

// R18-B 목표 1 — 세 종류의 크기 관계. 버스는 이 화면에서 유일하게 클릭해 고르는
// 대상이자 움직이는 실체라 가장 먼저 눈에 띄어야 한다(28px). 정차지는 버스가
// 들르는 고정 지점이라 버스보다 작지만 알아볼 크기(16px), 학생은 정차지 하나에
// 여럿이 몰릴 수 있어 가장 촘촘히 찍히므로 화면이 덮이지 않게 가장 작게 둔다
// (10px). 수정 전에는 세 종류 전부 12px 로 같아 색으로만 겨우 구별됐다(보고서 §1).
export const MARKER_SIZE_PX: Record<MapMarkerKind, number> = {
  bus: 28,
  stop: 16,
  student: 10,
  // R22 목표 2 — 출발지·도착지는 정차지보다 크다. 노선의 양 끝이라 경로를 읽는
  // 출발점이고, 첫 승차지·마지막 하차지와 같은 자리에 겹쳐 찍히므로 더 커야 위로 보인다.
  origin: 20,
  destination: 20,
};

// R19 목표 3 — 버스는 정차지·학생과 색·크기뿐 아니라 형태로도 구별돼야 한다(사용자
// 지시 — 그냥 파란 원이라 지도의 다른 POI 아이콘과 섞였다). `naver.maps.Marker` 의
// icon.content 는 HTML 문자열만 받으므로, `react-dom/server` 의 renderToStaticMarkup
// 으로 lucide-react 아이콘을 문자열로 굳혀 둔다 — 마커마다 다시 렌더링할 필요가
// 없어 모듈 로드 시 한 번만 계산한다.
//
// R21-A 목표 3 — 등원·하원은 색을 못 쓰므로(C-09 4색 고정) 아이콘 모양을 바꾼다.
// `Bus`(옆모습, 등원)와 `BusFront`(앞모습, 하원) 두 벌을 미리 굳혀 둔다.
const BUS_ICON_HTML: Record<MapMarkerDirection, string> = {
  to_academy: renderToStaticMarkup(
    <Bus color="#fff" size={Math.round(MARKER_SIZE_PX.bus * 0.6)} strokeWidth={2.5} />,
  ),
  from_academy: renderToStaticMarkup(
    <BusFront color="#fff" size={Math.round(MARKER_SIZE_PX.bus * 0.6)} strokeWidth={2.5} />,
  ),
};

// R21-A 목표 1 — 고른 마커를 흰 띠로 두른다(사용자 예시 그대로). 좌표 앵커가
// 밀리지 않도록 실제 크기(width/height)는 그대로 두고 box-shadow 로만 두른다.
// R21-A 추가 지시 ② — 구간변경 승인 지도의 "변한 승하차지"(삭제·순서 변경)도
// 같은 강조 수단을 그대로 쓴다(버스 전용이 아니다) — 종류별 색(MARKER_COLOR)을
// 그대로 테두리 색으로 써서 "그 마커가 강조됐다"는 뜻만 보태고 색 의미는 안 바꾼다.
const selectedRingOf = (kind: MapMarkerKind): string =>
  `box-shadow:0 0 0 3px #ffffff,0 0 0 6px ${MARKER_COLOR[kind]};`;

// R22 목표 2 — 출발지·도착지는 글자가 곧 뜻이다. 아이콘 모양으로 "출발"·"도착" 을
// 표현할 방법이 마땅치 않아(깃발 두 벌은 서로 구별이 안 된다) 두 글자를 그대로 쓴다.
const ENDPOINT_LABEL: Partial<Record<MapMarkerKind, string>> = {
  origin: "출발",
  destination: "도착",
};

export type MarkerIconOptions = {
  selected?: boolean;
  busNo?: string;
  direction?: MapMarkerDirection;
};

/**
 * R22 목표 1 — 버스를 서로 구별한다(사용자 지시 — 전부 같은 파란 원이라 어느 버스인지
 * 모른다). 번호를 핀 <b>아래 라벨</b>로 달던 R21-A 방식은 지도를 축소하면 라벨이 겹쳐
 * 읽히지 않았다. 번호를 핀 <b>안으로</b> 넣어 "아이콘 자체가 버스마다 다른" 형태로 바꾼다.
 *
 * <p>색을 버스마다 달리 하지 않은 이유 — 디자인 시스템 팔레트가 green·amber·red·stone
 * 4계열뿐이고 그 4색은 회차 상태(C-09)가 이미 쓴다. 버스 식별에 색을 또 얹으면 지도 위에서
 * 색 하나가 두 가지를 뜻하게 된다.
 */
const busChipHtml = (busNo: string, direction: MapMarkerDirection, selected: boolean): string => {
  const ring = selected ? selectedRingOf("bus") : "";
  return `<span style="display:inline-flex;align-items:center;gap:3px;height:${MARKER_SIZE_PX.bus}px;padding:0 8px 0 6px;border-radius:999px;background:${MARKER_COLOR.bus};border:2px solid #fff;${ring}white-space:nowrap;">${BUS_ICON_HTML[direction]}<span style="color:#fff;font-size:11px;font-weight:700;line-height:1;">${busNo}</span></span>`;
};

/** R22 목표 2 — 노선의 양 끝(출발지·도착지)을 글자 핀으로 찍는다. */
const endpointChipHtml = (kind: MapMarkerKind, selected: boolean): string => {
  const ring = selected ? selectedRingOf(kind) : "";
  return `<span style="display:inline-flex;align-items:center;justify-content:center;height:${MARKER_SIZE_PX[kind]}px;padding:0 7px;border-radius:999px;background:${MARKER_COLOR[kind]};border:2px solid #fff;${ring}color:#fff;font-size:11px;font-weight:700;line-height:1;white-space:nowrap;">${ENDPOINT_LABEL[kind]}</span>`;
};

export const buildMarkerIconHtml = (kind: MapMarkerKind, options: MarkerIconOptions = {}): string => {
  if (kind === "origin" || kind === "destination") {
    return endpointChipHtml(kind, options.selected ?? false);
  }
  if (kind === "bus" && options.busNo) {
    return busChipHtml(options.busNo, options.direction ?? "to_academy", options.selected ?? false);
  }
  const size = MARKER_SIZE_PX[kind];
  const icon = kind === "bus" ? BUS_ICON_HTML[options.direction ?? "to_academy"] : "";
  const ring = options.selected ? selectedRingOf(kind) : "";
  return `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${MARKER_COLOR[kind]};border:2px solid #fff;${ring}">${icon}</span>`;
};
