import * as React from 'react';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  description?: string;
  /** 오른쪽 주요 버튼들 */
  actions?: React.ReactNode;
  /** 하단 탭 영역 (SegmentedControl 또는 커스텀) */
  tabs?: React.ReactNode;
}
export function PageHeader(props: PageHeaderProps): JSX.Element;
