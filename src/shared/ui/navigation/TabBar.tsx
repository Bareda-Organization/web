import type { HTMLAttributes } from "react";
import type { TabBarItem } from "../../types";
import { Icon } from "../core/Icon";
import {
  StyledTabBar,
  StyledTabBarButton,
  StyledTabBarIconWrap,
  StyledTabBarBadge,
  StyledTabBarLabel,
} from "./TabBar.styled";

export type TabBarProps = Omit<HTMLAttributes<HTMLElement>, "onChange"> & {
  items: TabBarItem[];
  value?: string;
  onChange?: (value: string) => void;
};

// 하단 탭 — 앱 기본 이동. 5개 이하로 제한.
export const TabBar = ({ items, value, onChange, ...rest }: TabBarProps) => {
  return (
    <StyledTabBar {...rest}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <StyledTabBarButton
            key={item.value}
            type="button"
            $active={active}
            onClick={() => onChange?.(item.value)}
          >
            <StyledTabBarIconWrap>
              <Icon name={item.icon} size={22} />
              {item.badge ? <StyledTabBarBadge>{item.badge}</StyledTabBarBadge> : null}
            </StyledTabBarIconWrap>
            <StyledTabBarLabel $active={active}>{item.label}</StyledTabBarLabel>
          </StyledTabBarButton>
        );
      })}
    </StyledTabBar>
  );
};
