import * as React from 'react';

/**
 * 운행 상태 표시 — 세 제품에서 같은 상태는 항상 같은 색.
 */
export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** boarded=승차 완료·정상 운행 · moving=이동 중·지연 · missed=미탑승·긴급 · idle=운행 전·종료 */
  status?: 'boarded' | 'moving' | 'missed' | 'idle';
  /** 아이콘 대신 점 하나 (밀집 리스트용) */
  dot?: boolean;
  /** 아이콘 숨기기 */
  showIcon?: boolean;
}
export function StatusPill(props: StatusPillProps): JSX.Element;
