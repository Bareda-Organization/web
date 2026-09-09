import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** base=흰 카드+그림자 · mist=미스트 배경 블록 · outline=선만 · inverse=그린 블록 */
  tone?: 'base' | 'mist' | 'outline' | 'inverse';
  /** 내부 여백 px (기본 20) */
  padding?: number;
  /** 상태 강조가 필요할 때 카드 상단 3px 라인. 왼쪽 보더는 쓰지 않습니다 */
  accent?: 'boarded' | 'moving' | 'missed' | 'idle';
}
export function Card(props: CardProps): JSX.Element;
