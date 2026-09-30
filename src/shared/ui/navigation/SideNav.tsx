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
  /** 메뉴 항목의 주소 — 주면 링크(`<a>`)로 그려 새 탭으로 열기·링크 복사가 된다. 안 주면 버튼 */
  getHref?: (value: string) => string;
};

// 데스크톱 좌측 고정 내비게이션 — 관리자 웹 전용.
export const SideNav = ({ items = [], value, onChange, academy, getHref, ...rest }: SideNavProps) => {
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
              {...(getHref
                ? {
                    as: "a" as const,
                    href: getHref(item.value),
                    "aria-current": active ? ("page" as const) : undefined,
                    // Ctrl·Cmd·Shift·가운데 클릭은 새 탭·새 창으로 여는 조작이라 브라우저에 맡기고, 그냥 누를 때만 화면 전환을 가로챈다.
                    onClick: (event: React.MouseEvent) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                      event.preventDefault();
                      onChange?.(item.value);
                    },
                  }
                : { type: "button" as const, onClick: () => onChange?.(item.value) })}
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
