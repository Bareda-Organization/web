import * as React from 'react';

export interface TabBarItem { value: string; label: string; icon: string; badge?: number }

export interface TabBarProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  items?: TabBarItem[];
  value?: string;
  onChange?: (value: string) => void;
}
export function TabBar(props: TabBarProps): JSX.Element;
