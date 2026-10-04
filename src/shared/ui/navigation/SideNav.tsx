import { useId } from "react";
import type { HTMLAttributes } from "react";
import type { SideNavGroup, SideNavItem } from "../../types";
import { Icon } from "../core/Icon";
import {
  StyledSideNav,
  StyledSideNavInner,
  StyledSideNavBrand,
  StyledSideNavLogo,
  StyledSideNavAcademy,
  StyledSideNavList,
  StyledSideNavGroupTitle,
  StyledSideNavButton,
  StyledSideNavLabel,
  StyledSideNavBadge,
} from "./SideNav.styled";

export type SideNavProps = Omit<HTMLAttributes<HTMLElement>, "onChange"> & {
  /** 묶음 없는 평면 메뉴 — `groups` 를 주면 쓰지 않는다 */
  items?: SideNavItem[];
  /** 묶음 제목이 있는 메뉴. 제목 없는 묶음은 제목 줄 없이 이어진다 */
  groups?: SideNavGroup[];
  value?: string;
  onChange?: (value: string) => void;
  /** 로고 아래 학원 이름 */
  academy?: string;
  /** 메뉴 항목의 주소 — 주면 링크(`<a>`)로 그려 새 탭으로 열기·링크 복사가 된다. 안 주면 버튼 */
  getHref?: (value: string) => string;
};

// 데스크톱 좌측 고정 내비게이션 — 관리자 웹 전용.
export const SideNav = ({ items = [], groups, value, onChange, academy, getHref, ...rest }: SideNavProps) => {
  const idBase = useId();
  const sections: SideNavGroup[] = groups ?? [{ items }];

  const renderItem = (item: SideNavItem) => {
    const active = item.value === value;
    const badge = item.badge && item.badge > 0 ? item.badge : undefined;
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
        // 숫자만 읽히면 무엇의 건수인지 모른다 — 이름에 건수를 붙인다
        aria-label={badge ? `${item.label} ${badge}건` : undefined}
        $active={active}
      >
        <Icon name={item.icon} size={18} />
        <StyledSideNavLabel>{item.label}</StyledSideNavLabel>
        {badge ? <StyledSideNavBadge aria-hidden="true">{badge}</StyledSideNavBadge> : null}
      </StyledSideNavButton>
    );
  };

  return (
    <StyledSideNav {...rest}>
      <StyledSideNavInner>
        <StyledSideNavBrand>
          <StyledSideNavLogo translate="no">바래다</StyledSideNavLogo>
          {academy ? <StyledSideNavAcademy>{academy}</StyledSideNavAcademy> : null}
        </StyledSideNavBrand>
        <StyledSideNavList aria-label="주 메뉴">
          {sections.map((section, index) => {
            if (!section.title) return section.items.map(renderItem);
            const titleId = `${idBase}-group-${index}`;
            return (
              <div key={section.title} role="group" aria-labelledby={titleId}>
                <StyledSideNavGroupTitle id={titleId}>{section.title}</StyledSideNavGroupTitle>
                {section.items.map(renderItem)}
              </div>
            );
          })}
        </StyledSideNavList>
      </StyledSideNavInner>
    </StyledSideNav>
  );
};
