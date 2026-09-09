import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** added=금일 추가된 탑승자(초록) · removed=삭제된 탑승자(빨강) — 관계자 웹 금일 운행 규칙 */
  tone?: 'neutral' | 'brand' | 'amber' | 'red' | 'added' | 'removed';
  /** 숫자 뱃지 (알림 개수, 미탑승 인원) */
  count?: number;
}
export function Badge(props: BadgeProps): JSX.Element;
