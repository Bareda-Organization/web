import type { HTMLAttributes } from "react";
import type { SideNavItem } from "../../types";
import { Icon } from "../core/Icon";
import {
  StyledSideNav,
  StyledSideNavBrand,
  StyledSideNavLogo,
  StyledSideNavAcademy,
  StyledSideNavList,
  StyledSideNavButton,
  StyledSideNavLabel,
  StyledSideNavBadge,
} from "./SideNav.styled";

export type SideNavProps = Omit<HTMLAttributes<HTMLElement>, "onChange"> & {
  items?: SideNavItem[];
  value?: string;
  onChange?: (value: string) => void;
  /** 로고 아래 학원 이름 */
  academy?: string;
};

// 데스크톱 좌측 고정 내비게이션 — 관리자 웹 전용.
export const SideNav = ({ items = [], value, onChange, academy, ...rest }: SideNavProps) => {
  return (
    <StyledSideNav {...rest}>
      <StyledSideNavBrand>
        <StyledSideNavLogo>바래다</StyledSideNavLogo>
        {academy ? <StyledSideNavAcademy>{academy}</StyledSideNavAcademy> : null}
      </StyledSideNavBrand>
      <StyledSideNavList>
        {items.map((item) => {
          const active = item.value === value;
          return (
            <StyledSideNavButton
              key={item.value}
              type="button"
              onClick={() => onChange?.(item.value)}
              $active={active}
            >
              <Icon name={item.icon} size={18} />
              <StyledSideNavLabel>{item.label}</StyledSideNavLabel>
              {item.badge ? <StyledSideNavBadge>{item.badge}</StyledSideNavBadge> : null}
            </StyledSideNavButton>
          );
        })}
      </StyledSideNavList>
    </StyledSideNav>
  );
};
