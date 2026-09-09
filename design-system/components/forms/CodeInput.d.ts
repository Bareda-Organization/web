import * as React from 'react';

/**
 * 부여된 코드 입력 — 세 제품 모두 아이디/비밀번호 없이 코드로 로그인합니다.
 */
export interface CodeInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** 칸 수 (기본 6) */
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  hint?: string;
  /** 로그인 실패 시 문구. 다음 행동을 함께 안내합니다 */
  error?: string;
}
export function CodeInput(props: CodeInputProps): JSX.Element;
