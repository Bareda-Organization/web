import styled from "@emotion/styled";

export const StyledTabBar = styled.nav`
  display: flex;
  height: var(--tabbar-h);
  background: var(--surface-card);
  border-top: 1px solid var(--border-subtle);
`;

export const StyledTabBarButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${(props) => (props.$active ? "var(--accent-primary)" : "var(--text-tertiary)")};
  transition: var(--transition-control);
  position: relative;
`;

export const StyledTabBarIconWrap = styled.span`
  position: relative;
`;

export const StyledTabBarBadge = styled.span`
  position: absolute;
  top: -3px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--status-missed);
  color: var(--white);
  font: var(--fw-bold) 10px / 16px var(--font-sans);
  text-align: center;
`;

export const StyledTabBarLabel = styled.span<{ $active: boolean }>`
  font: ${(props) => (props.$active ? "var(--fw-medium)" : "var(--fw-regular)")} 11px / 1 var(--font-sans);
`;
