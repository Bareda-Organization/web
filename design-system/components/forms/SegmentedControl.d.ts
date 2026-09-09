import * as React from 'react';

export interface SegmentedOption { value: string; label: string }

export interface SegmentedControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options?: Array<string | SegmentedOption>;
  value?: string;
  onChange?: (value: string) => void;
  block?: boolean;
}
export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
