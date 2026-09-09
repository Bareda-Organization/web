import * as React from 'react';

/**
 * 이름 검색 — Enter 또는 검색 버튼으로 제출 (관계자 웹 학생/매니저 관리 플로우).
 */
export interface SearchFieldProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}
export function SearchField(props: SearchFieldProps): JSX.Element;
