import styled from "@emotion/styled";

type StyledTabsProps = {
  $block: boolean;
};

export const StyledTabs = styled.div<StyledTabsProps>`
  display: ${({ $block }) => ($block ? "flex" : "inline-flex")};
  width: ${({ $block }) => ($block ? "100%" : "auto")};
  gap: 4px;
  padding: 4px;
  background: var(--bg-subtle);
  border-radius: var(--radius-control);
`;

type StyledTabProps = {
  $selected: boolean;
  $block: boolean;
};

export const StyledTab = styled.button<StyledTabProps>`
  flex: ${({ $block }) => ($block ? 1 : "none")};
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: ${({ $selected }) => ($selected ? "var(--surface-card)" : "transparent")};
  box-shadow: ${({ $selected }) => ($selected ? "var(--shadow-sm)" : "none")};
  color: ${({ $selected }) => ($selected ? "var(--text-primary)" : "var(--text-secondary)")};
  font-family: var(--font-sans);
  font-size: var(--fs-label-sm);
  line-height: 1;
  font-weight: ${({ $selected }) => ($selected ? "var(--fw-medium)" : "var(--fw-regular)")};
  transition: var(--transition-control);
`;
