import * as React from 'react';

export interface SideNavItem { value: string; label: string; icon: string; badge?: number }

export interface SideNavProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  items?: SideNavItem[];
  value?: string;
  onChange?: (value: string) => void;
  /** 로고 아래 학원 이름 */
  academy?: string;
}
export function SideNav(props: SideNavProps): JSX.Element;
