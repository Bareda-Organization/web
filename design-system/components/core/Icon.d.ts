import * as React from 'react';

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Lucide 아이콘 이름 (kebab-case). 예: 'bus', 'map-pin', 'bell', 'user-round' */
  name: string;
  /** px. 앱 기본 20, 탭바 24, 인라인 16 */
  size?: number;
}
export function Icon(props: IconProps): JSX.Element;
