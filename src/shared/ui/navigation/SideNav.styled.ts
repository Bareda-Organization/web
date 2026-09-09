import styled from "@emotion/styled";

export const StyledSideNav = styled.aside`
  width: var(--sidenav-w);
  flex: none;
  display: flex;
  flex-direction: column;
  background: var(--surface-chrome);
  color: var(--text-on-chrome);
  border-right: 1px solid var(--border-chrome);
  padding: 20px 12px;
`;

export const StyledSideNavBrand = styled.div`
  padding: 0 10px 20px;
`;

export const StyledSideNavLogo = styled.div`
  font: var(--fw-black) 24px / 1 var(--font-serif);
  letter-spacing: -0.03em;
`;

export const StyledSideNavAcademy = styled.div`
  margin-top: 6px;
  font: var(--fw-light) var(--fs-micro) / 1.4 var(--font-sans);
  color: var(--text-on-chrome-muted);
`;

export const StyledSideNavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const StyledSideNavButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 10px;
  background: ${(props) => (props.$active ? "var(--nav-active-bg)" : "transparent")};
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: ${(props) => (props.$active ? "var(--nav-active-text)" : "var(--nav-text)")};
  font: ${(props) => (props.$active ? "var(--fw-medium)" : "var(--fw-regular)")} var(--fs-body-sm) / 1 var(--font-sans);
  text-align: left;
  transition: var(--transition-control);
`;

export const StyledSideNavLabel = styled.span`
  flex: 1;
`;

export const StyledSideNavBadge = styled.span`
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--status-missed);
  color: var(--white);
  font: var(--fw-bold) 11px / 20px var(--font-sans);
  text-align: center;
`;
