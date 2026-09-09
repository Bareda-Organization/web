import * as React from 'react';

export interface Stop {
  name: string;
  address?: string;
  /** 도착 예정 또는 실제 시각. 항상 구체적으로 ('곧' 금지) */
  time?: string;
  /** done=지나감 · current=현재 이동 중 · next=다음 정류장 · upcoming=이후 */
  state?: 'done' | 'current' | 'next' | 'upcoming';
  /** 이 정류장 탑승 인원 */
  riders?: number;
  /** 미탑승 인원 */
  missed?: number;
}

/**
 * 정류장 순서 타임라인 — 세 제품 공통. 현재 정류장에 버스 마커가 붙습니다.
 */
export interface StopTimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  stops?: Stop[];
  onSelect?: (stop: Stop, index: number) => void;
  /** 간격 좁게 (관계자 웹 목록) */
  dense?: boolean;
}
export function StopTimeline(props: StopTimelineProps): JSX.Element;
