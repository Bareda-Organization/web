import * as React from 'react';

/**
 * 도착 지연 시간 선택 — 기사·동승자 앱 공통, 5분 단위 고정.
 */
export interface DelayPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: number;
  onChange?: (minutes: number) => void;
  /** 분 단위 후보값. 기본 [5,10,15,20,25,30] */
  options?: number[];
}
export function DelayPicker(props: DelayPickerProps): JSX.Element;
