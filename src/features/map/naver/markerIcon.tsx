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

// R21-A 목표 1 — 고른 버스를 흰 띠로 두른다(사용자 예시 그대로). 좌표 앵커가
// 밀리지 않도록 실제 크기(width/height)는 그대로 두고 box-shadow 로만 두른다.
const SELECTED_RING = "box-shadow:0 0 0 3px #ffffff,0 0 0 6px #2563eb;";

export type MarkerIconOptions = {
  selected?: boolean;
  busNo?: string;
  direction?: MapMarkerDirection;
};

export const buildMarkerIconHtml = (kind: MapMarkerKind, options: MarkerIconOptions = {}): string => {
  const size = MARKER_SIZE_PX[kind];
  const icon = kind === "bus" ? BUS_ICON_HTML[options.direction ?? "to_academy"] : "";
  const ring = kind === "bus" && options.selected ? SELECTED_RING : "";
  const pin = `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${MARKER_COLOR[kind]};border:2px solid #fff;${ring}">${icon}</span>`;
  // R21-A 목표 2 — 버스 번호를 핀 아래 작은 라벨로 붙인다(28px 핀 안에는 못 넣는다).
  if (kind !== "bus" || !options.busNo) return pin;
  const label = `<span style="margin-top:2px;padding:0 4px;border-radius:4px;background:#111827;color:#fff;font-size:10px;line-height:14px;white-space:nowrap;">${options.busNo}</span>`;
  return `<div style="display:flex;flex-direction:column;align-items:center;">${pin}${label}</div>`;
};
