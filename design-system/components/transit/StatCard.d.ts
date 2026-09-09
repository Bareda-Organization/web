import * as React from 'react';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  value?: React.ReactNode;
  /** '명', '개' 등 */
  unit?: string;
  /** 숫자 색. missed는 화면당 한 번만 */
  tone?: 'neutral' | 'boarded' | 'moving' | 'missed';
  icon?: string;
  sub?: string;
}
export function StatCard(props: StatCardProps): JSX.Element;
