import * as React from 'react';

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  title?: string;
  /** 버튼 영역. 취소는 ghost, 확정은 primary 또는 danger */
  footer?: React.ReactNode;
  onClose?: () => void;
  width?: number;
}
export function Dialog(props: DialogProps): JSX.Element;
