import * as React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Lucide 아이콘 이름 */
  icon: string;
  /** 접근성 라벨 (필수) */
  label: string;
  /** plain=툴바·리스트 · soft=미스트 원형 · inverse=크롬(헤더·사이드바) 위 */
  tone?: 'plain' | 'soft' | 'inverse';
  /** 버튼 지름 px. 터치 영역은 최소 44 */
  size?: number;
}
export function IconButton(props: IconButtonProps): JSX.Element;
