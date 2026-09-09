import * as React from 'react';

export interface BottomSheetProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  title?: string;
  onClose?: () => void;
}
export function BottomSheet(props: BottomSheetProps): JSX.Element;
