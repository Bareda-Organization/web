import * as React from 'react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide 아이콘 이름 */
  icon?: string;
  title?: string;
  action?: React.ReactNode;
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
