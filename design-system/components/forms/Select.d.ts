import * as React from 'react';

export interface SelectOption { value: string; label: string }

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  hint?: string;
  /** 문자열 배열 또는 {value,label} 배열 */
  options?: Array<string | SelectOption>;
  wrapStyle?: React.CSSProperties;
}
export function Select(props: SelectProps): JSX.Element;
