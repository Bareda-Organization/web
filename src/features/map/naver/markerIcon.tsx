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
//
// 2026-09-23 — 정차지가 물방울 핀이 되면서 16 → 22(핀의 폭). 16 에서는 핀 머리 안 숫자가 7px 로
// 줄어 두 자리 순번(10~15)을 못 읽는다. 출발지·도착지는 아래 규칙대로 그보다 크게 따라 올린다.
export const MARKER_SIZE_PX: Record<MapMarkerKind, number> = {
  bus: 28,
  stop: 22,
  student: 10,
  // R22 목표 2 — 출발지·도착지는 정차지보다 크다. 노선의 양 끝이라 경로를 읽는
  // 출발점이고, 첫 승차지·마지막 하차지와 같은 자리에 겹쳐 찍히므로 더 커야 위로 보인다.
  origin: 24,
  destination: 24,
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

// R22 추가 지시 — 번호만으로는 한눈에 안 갈린다(사용자 지시). 버스마다 색도 다르게 한다.
//
// ⚠ 색 하나가 두 가지를 뜻하지 않도록 **회차 상태 4색을 피해서** 고른다. 지도 위에서
// 상태를 뜻하는 것은 노선 선 색이다(`routeColor.ts` — 초록 종료 · 앰버 이동중 · 레드 확정 ·
// 스톤 대기). 아래 6색은 그 4색과도, 정차지 초록(#16a34a)·학생 주황(#f97316)·출발도착
// 스톤(#2A312E)과도 계열이 겹치지 않는 파랑~보라~청록 대역이다.
const BUS_COLORS = [
  "#2563eb", // 파랑 — 수정 전 모든 버스가 쓰던 색. 첫 자리에 둬서 1호차가 예전과 같아 보이게 한다.
  "#7C3AED", // 보라
  "#0891B2", // 청록
  "#BE185D", // 자홍
  "#4338CA", // 남색
  "#0F766E", // 짙은 청록
] as const;

/**
 * 버스 번호 → 색. **번호 문자열만으로 정한다** — 목록에서의 순서로 정하면 회차가 늘거나 줄 때
 * 같은 버스의 색이 바뀌고, 화면마다(관제·대시보드·금일 운행) 목록이 달라 같은 버스가 다른 색이
 * 된다. 문자 코드 합을 색 개수로 나눈 나머지라 어느 화면에서 봐도, 새로고침해도 같다.
 *
 * <p>버스가 7대를 넘으면 두 대가 같은 색을 받는다 — 그때는 칩 안의 번호가 여전히 둘을 가른다.
 * 색은 "빠르게 훑는" 수단이고 번호가 정본이다.
 */
export const busColorOf = (busNo: string): string => {
  let sum = 0;
  for (const char of busNo) sum += char.codePointAt(0) ?? 0;
  return BUS_COLORS[sum % BUS_COLORS.length];
};

export type MarkerIconOptions = {
  selected?: boolean;
  busNo?: string;
  /** 정차지 순번(R27 사용자 지시 — 각 정차지 표기). 주면 원 핀 대신 숫자 칩을 그린다. */
  seq?: number;
  direction?: MapMarkerDirection;
  // R23 목표 4 — 지도 위 마커를 눌러 고른다. 누가 눌렸는지는 이 속성으로 되찾는다
  // (SDK 의 마커 클릭 이벤트가 이 아이콘 형태에서는 안 걸렸다 — NaverMapSurface 주석 참고).
  markerId?: string;
};

// F01-02 — SDK 는 아이콘 문자열을 그대로 DOM 에 넣는다. 관계자가 입력하는 호차명이 태그로 살아나지 않게
// 문자열로 끼우는 값은 전부 이 함수를 거친다.
const escapeHtml = (raw: string): string =>
  raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** 클릭 위임이 마커를 되찾는 표식. 마커 id 는 내부 값(회차 번호·`stop-7`)이지만 속성 값이라 이스케이프한다. */
const markerIdAttr = (markerId?: string): string => (markerId ? ` data-marker-id="${escapeHtml(markerId)}"` : "");

/**
 * R22 목표 1 — 버스를 서로 구별한다(사용자 지시 — 전부 같은 파란 원이라 어느 버스인지
 * 모른다). 번호를 핀 <b>아래 라벨</b>로 달던 R21-A 방식은 지도를 축소하면 라벨이 겹쳐
 * 읽히지 않았다. 번호를 핀 <b>안으로</b> 넣어 "아이콘 자체가 버스마다 다른" 형태로 바꾼다.
 *
 * <p>R22 추가 지시 — 번호에 더해 <b>색</b>도 버스마다 다르다({@link busColorOf}). 상태를 뜻하는
 * 색과 겹치지 않는 대역에서만 고른다 — 근거는 {@code BUS_COLORS} 주석.
 */
const busChipHtml = (busNo: string, direction: MapMarkerDirection, selected: boolean, markerId?: string): string => {
  const color = busColorOf(busNo);
  // 선택 강조는 그 버스의 색으로 두른다 — 종류별 색을 쓰는 `selectedRingOf` 와 같은 규칙을
  // 버스에만 한 단계 좁힌 것이다(테두리가 "그 마커의 색" 이라는 뜻은 그대로다).
  const ring = selected ? `box-shadow:0 0 0 3px #ffffff,0 0 0 6px ${color};` : "";
  return `<span${markerIdAttr(markerId)} style="display:inline-flex;align-items:center;gap:3px;height:${MARKER_SIZE_PX.bus}px;padding:0 8px 0 6px;border-radius:999px;background:${color};border:2px solid #fff;${ring}white-space:nowrap;">${BUS_ICON_HTML[direction]}<span style="color:#fff;font-size:11px;font-weight:700;line-height:1;">${escapeHtml(busNo)}</span></span>`;
};

// 물방울 핀 윤곽 — 머리는 (12,12) 중심 반지름 12 의 원, 끝점은 (12,32). viewBox 를 흰 테두리
// 두께(2)의 절반씩 넓혀 잘리지 않게 한다. 끝점이 viewBox 아래 끝에서 1 단위(약 0.8px) 위다.
const STOP_PIN_PATH = "M12 32C12 32 0 20.5 0 12a12 12 0 0 1 24 0c0 8.5-12 20-12 20z";
const STOP_PIN_VIEWBOX = { x: -1, y: -1, width: 26, height: 34 };
const STOP_PIN_HEIGHT_PX = Math.round((MARKER_SIZE_PX.stop * STOP_PIN_VIEWBOX.height) / STOP_PIN_VIEWBOX.width);

/**
 * 정차지 핀 — 끝이 좌표를 가리키는 물방울 모양, 머리 안에 순번(사용자 지시 2026-09-23).
 *
 * <p>R27 의 순번 칩(편성 목록의 번호와 지도의 핀을 같은 숫자로 잇는다)을 모양만 바꾼 것이다.
 * 선택 강조는 핀 윤곽을 따라 종류 색의 굵은 선을 먼저 긋는다 — box-shadow 는 사각형으로 그려져
 * 핀 모양을 따라가지 못한다. `overflow="visible"` 이 그 굵은 선이 viewBox 밖으로 나가도 보이게 한다.
 */
const stopPinHtml = (seq: number | undefined, selected: boolean, markerId?: string): string => {
  const { x, y, width, height } = STOP_PIN_VIEWBOX;
  const ring = selected
    ? `<path d="${STOP_PIN_PATH}" fill="none" stroke="${MARKER_COLOR.stop}" stroke-width="9" stroke-linejoin="round"/>`
    : "";
  const label =
    seq == null
      ? ""
      : `<text x="12" y="12.5" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="13" font-weight="700">${seq}</text>`;
  return `<span${markerIdAttr(markerId)} style="display:block;width:${MARKER_SIZE_PX.stop}px;height:${STOP_PIN_HEIGHT_PX}px;"><svg width="${MARKER_SIZE_PX.stop}" height="${STOP_PIN_HEIGHT_PX}" viewBox="${x} ${y} ${width} ${height}" overflow="visible" style="display:block;">${ring}<path d="${STOP_PIN_PATH}" fill="${MARKER_COLOR.stop}" stroke="#fff" stroke-width="${selected ? 4 : 2}" stroke-linejoin="round"/>${label}</svg></span>`;
};

/** R22 목표 2 — 노선의 양 끝(출발지·도착지)을 글자 핀으로 찍는다. */
const endpointChipHtml = (kind: MapMarkerKind, selected: boolean, markerId?: string): string => {
  const ring = selected ? selectedRingOf(kind) : "";
  return `<span${markerIdAttr(markerId)} style="display:inline-flex;align-items:center;justify-content:center;height:${MARKER_SIZE_PX[kind]}px;padding:0 7px;border-radius:999px;background:${MARKER_COLOR[kind]};border:2px solid #fff;${ring}color:#fff;font-size:11px;font-weight:700;line-height:1;white-space:nowrap;">${ENDPOINT_LABEL[kind]}</span>`;
};

/**
 * R25 목표 2 — 마커를 **제 좌표 위에 가운데로** 얹는다.
 *
 * <p>`naver.maps.Marker` 의 HTML 아이콘은 `size`·`anchor` 를 주지 않으면 아이콘의 <b>좌상단</b>이
 * 좌표에 놓인다 — 그래서 지금까지 모든 마커가 아이콘 절반만큼 오른쪽·아래로 밀려 그려졌다
 * (2026-09-20 실측 — 버스를 정중앙에 놓았는데 화면에서는 38px 벗어났다).
 *
 * <p>`size`·`anchor` 를 계산해 넘기지 않고 CSS 로 미는 이유 — 버스 칩은 번호 길이에 따라 폭이
 * 달라져서 가로 크기를 미리 알 수 없다. `translate(-50%, -50%)` 는 제 크기를 기준으로 밀기
 * 때문에 폭이 얼마든 항상 가운데가 맞는다. 클릭 판정도 따라온다(CSS 변형은 히트 테스트에
 * 반영된다) — 이 화면의 마커 클릭은 SDK 가 아니라 DOM 위임이라 그대로 동작한다.
 */
const centeredOnPoint = (html: string): string =>
  `<span style="display:inline-block;transform:translate(-50%,-50%);">${html}</span>`;

/** 정차지 핀 전용 — 핀의 <b>아래 끝</b>이 좌표에 오도록 제 높이 전체만큼 올린다(가로는 가운데). */
const tipOnPoint = (html: string): string =>
  `<span style="display:inline-block;transform:translate(-50%,-100%);">${html}</span>`;

export const buildMarkerIconHtml = (kind: MapMarkerKind, options: MarkerIconOptions = {}): string => {
  if (kind === "origin" || kind === "destination") {
    return centeredOnPoint(endpointChipHtml(kind, options.selected ?? false, options.markerId));
  }
  if (kind === "stop") {
    return tipOnPoint(stopPinHtml(options.seq, options.selected ?? false, options.markerId));
  }
  if (kind === "bus" && options.busNo) {
    return centeredOnPoint(
      busChipHtml(options.busNo, options.direction ?? "to_academy", options.selected ?? false, options.markerId),
    );
  }
  const size = MARKER_SIZE_PX[kind];
  const icon = kind === "bus" ? BUS_ICON_HTML[options.direction ?? "to_academy"] : "";
  const ring = options.selected ? selectedRingOf(kind) : "";
  return centeredOnPoint(
    `<span${markerIdAttr(options.markerId)} style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${MARKER_COLOR[kind]};border:2px solid #fff;${ring}">${icon}</span>`,
  );
};
