import * as React from 'react';

export interface StudentRowProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  /** 정류장 · 반 · 보호자 등 한 줄 */
  meta?: string;
  phone?: string;
  /** 동승자 앱이 결정하는 탑승 상태 */
  ride?: 'boarded' | 'alighted' | 'absent' | 'missed' | 'waiting';
  selected?: boolean;
  onSelect?: () => void;
  onCall?: () => void;
  /** 상태 pill 대신 넣을 컨트롤 (탑승/미등원/하차 전환 버튼) */
  actions?: React.ReactNode;
}
export function StudentRow(props: StudentRowProps): JSX.Element;
