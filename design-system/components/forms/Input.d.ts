import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** 보조 설명 (300 / 13px) */
  hint?: string;
  /** 에러 문구. 차분하게 쓰고 다음 행동을 함께 안내합니다 */
  error?: string;
  /** 왼쪽 Lucide 아이콘 */
  icon?: string;
  /** 오른쪽 단위 텍스트 (예: '분', '명') */
  suffix?: string;
  required?: boolean;
  wrapStyle?: React.CSSProperties;
}
export function Input(props: InputProps): JSX.Element;
