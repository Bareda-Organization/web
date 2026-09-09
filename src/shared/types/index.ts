import type { ReactNode } from "react";

// 여러 기능이 공유하는 타입을 이 폴더에 둔다.
// 아래는 `shared/ui/{feedback,navigation,transit}` 컴포넌트가 props 안에서 쓰는
// 하위 타입이다 — 컴포넌트 자체의 Props 타입은 각 컴포넌트 파일 맨 위에 둔다
// (`frontend/CONVENTIONS.md` "타입" 절: "props 안에서 쓰는 배열·객체 타입 포함").

/** StopTimeline 정류장 하나 — 세 제품 공통, 현재 정류장에 버스 마커가 붙는다. */
export type Stop = {
  name: string;
  address?: string;
  /** 도착 예정 또는 실제 시각. 항상 구체적으로 표기한다 ('곧' 금지) */
  time?: string;
  /** done=지나감 · current=현재 이동 중 · next=다음 정류장 · upcoming=이후 */
  state?: "done" | "current" | "next" | "upcoming";
  /** 이 정류장 탑승 인원 */
  riders?: number;
  /** 미탑승 인원 */
  missed?: number;
};

/** TabBar 탭 항목 */
export type TabBarItem = {
  value: string;
  label: string;
  icon: string;
  badge?: number;
};

/** SideNav 메뉴 항목 */
export type SideNavItem = {
  value: string;
  label: string;
  icon: string;
  badge?: number;
};

/** RosterTable 컬럼 정의 — 행 타입 T 는 소비하는 화면이 정한다 */
export type RosterColumn<T = Record<string, unknown>> = {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: number | string;
  render?: (row: T) => ReactNode;
};
