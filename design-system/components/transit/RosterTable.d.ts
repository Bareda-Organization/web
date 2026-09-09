import * as React from 'react';

export interface RosterColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  render?: (row: any) => React.ReactNode;
}

/**
 * 관계자 웹 명단 표 — 버스별 탑승 인원, 학생 명부, 매니저 목록.
 */
export interface RosterTableProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: RosterColumn[];
  rows?: any[];
  onRowClick?: (row: any) => void;
}
export function RosterTable(props: RosterTableProps): JSX.Element;
