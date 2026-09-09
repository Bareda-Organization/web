import * as React from 'react';

/**
 * 오늘 운행 요약 — 학부모 앱 홈, 매니저 앱 운행모드 상단.
 */
export interface RunSummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 예: '3-2호차' */
  bus?: string;
  /** 예: '등원' / '하원' */
  leg?: string;
  status?: 'boarded' | 'moving' | 'missed' | 'idle';
  statusLabel?: string;
  /** 결론 한 줄. 예: '약 5분 후 도착합니다' */
  eta?: string;
  currentStop?: string;
  nextStop?: string;
  manager?: string;
  driver?: string;
}
export function RunSummaryCard(props: RunSummaryCardProps): JSX.Element;
