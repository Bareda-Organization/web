import * as React from 'react';

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 상태 컬러 규칙을 그대로 따릅니다 */
  tone?: 'info' | 'moving' | 'missed' | 'boarded';
  title?: string;
  /** 하단 버튼 영역 — 문제 상황이면 다음 행동을 함께 둡니다 */
  action?: React.ReactNode;
}
export function AlertBanner(props: AlertBannerProps): JSX.Element;
