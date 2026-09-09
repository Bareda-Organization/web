import * as React from 'react';

export interface SwitchProps extends Omit<React.HTMLAttributes<HTMLLabelElement>, 'onChange'> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  label?: React.ReactNode;
  sublabel?: string;
  /** 도착 지연 알림처럼 끌 수 없는 항목은 disabled로 두고 이유를 sublabel에 씁니다 */
  disabled?: boolean;
}
export function Switch(props: SwitchProps): JSX.Element;
