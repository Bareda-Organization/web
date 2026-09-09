import * as React from 'react';

/**
 * 학부모·학생 앱 알림 카드 — 제목은 세리프, 시각·정류장은 산세리프.
 */
export interface NotificationCardProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: 'boarded' | 'moving' | 'missed' | 'idle';
  /** pill 안 문구. 비우면 상태 기본 라벨 */
  statusLabel?: string;
  /** 결론 한 줄. 예: '하준이가 승차했어요' */
  title?: string;
  /** 시각 · 정류장. 예: '8:37 · 한화아파트 정류장' */
  meta?: string;
  /** 보조 한 줄. 예: '도착 예정 8:58' */
  sub?: string;
  /** 오른쪽 위 상대 시각 */
  time?: string;
  unread?: boolean;
}
export function NotificationCard(props: NotificationCardProps): JSX.Element;
