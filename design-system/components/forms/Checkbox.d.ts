import * as React from 'react';

export interface CheckboxProps extends Omit<React.HTMLAttributes<HTMLLabelElement>, 'onChange'> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  label?: React.ReactNode;
  /** 보조 설명 한 줄 */
  sublabel?: string;
  disabled?: boolean;
}
export function Checkbox(props: CheckboxProps): JSX.Element;
