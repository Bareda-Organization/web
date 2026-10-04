import styled from "@emotion/styled";

// 바깥 aside 는 페이지 전체 높이로 늘어나 면과 오른쪽 선을 그리고, 안쪽 판이 화면에 붙어 따라온다(시안 kit 15절).
export const StyledSideNav = styled.aside`
  width: var(--sidenav-w);
  flex: none;
  background: var(--surface-chrome);
  color: var(--text-on-chrome);
  border-right: 1px solid var(--border-chrome);
`;

export const StyledSideNavInner = styled.div`
  position: sticky;
  top: 0;
  max-height: 100vh;
  overflow: auto;
  padding: 18px 12px 24px;
`;

export const StyledSideNavBrand = styled.div`
  margin-bottom: 14px;
`;

export const StyledSideNavLogo = styled.div`
  padding: 0 10px;
  font: var(--fw-black) var(--fs-2xl) / 1.2 var(--font-serif);
  letter-spacing: -0.03em;
`;

// 긴 학원명은 두 줄까지만 — 메뉴가 밀려 내려가지 않게 한다.
export const StyledSideNavAcademy = styled.div`
  padding: 2px 10px 0;
  font: var(--fw-regular) var(--fs-sm) / 1.5 var(--font-sans);
  color: var(--text-secondary);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const StyledSideNavList = styled.nav`
  display: flex;
  flex-direction: column;
`;

export const StyledSideNavGroupTitle = styled.div`
  padding: 16px 12px 4px;
  font: var(--fw-bold) var(--fs-xs) / 1.5 var(--font-sans);
  letter-spacing: 0.04em;
  color: var(--text-secondary);
`;

export const StyledSideNavButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  background: ${(props) => (props.$active ? "var(--nav-active-bg)" : "transparent")};
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: ${(props) => (props.$active ? "var(--nav-active-text)" : "var(--nav-text)")};
  font: ${(props) => (props.$active ? "var(--fw-medium)" : "var(--fw-regular)")} var(--fs-md) / 1.4 var(--font-sans);
  text-align: left;
  text-decoration: none;
  transition: transform var(--dur-press) var(--ease-out);

  & > svg {
    flex-shrink: 0;
  }

  /* 하루 수십 번 쓰는 메뉴라 호버는 전환 없이 즉시 바뀐다 */
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${(props) => (props.$active ? "var(--nav-active-bg)" : "var(--green-50)")};
      color: ${(props) => (props.$active ? "var(--nav-active-text)" : "var(--text-primary)")};
    }
  }

  &:active {
    transform: ${(props) => (props.$active ? "none" : "scale(0.98)")};
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;

export const StyledSideNavLabel = styled.span`
  flex: 1;
`;

export const StyledSideNavBadge = styled.span`
  min-width: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--bad-solid);
  color: var(--on-bad);
  font: var(--fw-bold) var(--fs-xs) / 1.5 var(--font-sans);
  text-align: center;
`;
