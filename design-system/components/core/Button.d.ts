import * as React from 'react';

/**
 * 바래다 기본 버튼.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary=주요 행동(그린/다크에선 앰버) · secondary=보조 · soft=미스트 배경 · ghost=텍스트만 · danger=미탑승·삭제 */
  variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
  /** sm 36 · md 44 · lg 52 (앱 주요 버튼은 lg) */
  size?: 'sm' | 'md' | 'lg';
  /** 앞쪽 Lucide 아이콘 이름 */
  icon?: string;
  /** 뒤쪽 Lucide 아이콘 이름 */
  iconEnd?: string;
  /** 가로 100% */
  block?: boolean;
}
export function Button(props: ButtonProps): JSX.Element;
