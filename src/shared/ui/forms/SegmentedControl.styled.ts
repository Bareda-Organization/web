import styled from "@emotion/styled";

type StyledTabsProps = {
  $block: boolean;
};

// 시안 kit 4절의 필터 알약 묶음 — 조건 바꾸기용. 같은 목록을 나누는 건수 탭은 navigation/Tabs.
export const StyledTabs = styled.div<StyledTabsProps>`
  display: ${({ $block }) => ($block ? "flex" : "inline-flex")};
  width: ${({ $block }) => ($block ? "100%" : "auto")};
  flex-wrap: wrap;
  gap: 6px;
`;

type StyledTabProps = {
  $selected: boolean;
  $block: boolean;
};

export const StyledTab = styled.button<StyledTabProps>`
  flex: ${({ $block }) => ($block ? 1 : "none")};
  padding: 4px 12px;
  border: 0;
  border-radius: 999px;
  background: ${({ $selected }) => ($selected ? "var(--accent-primary-soft)" : "var(--surface-card)")};
  box-shadow: ${({ $selected }) => ($selected ? "none" : "inset 0 0 0 1px var(--border-default)")};
  color: ${({ $selected }) => ($selected ? "var(--text-brand)" : "var(--text-secondary)")};
  font-family: var(--font-sans);
  font-size: var(--fs-sm);
  line-height: 1.4;
  font-weight: ${({ $selected }) => ($selected ? "var(--fw-medium)" : "var(--fw-regular)")};
  cursor: pointer;
  transition:
    background-color var(--dur-ui) var(--ease-out),
    color var(--dur-ui) var(--ease-out),
    box-shadow var(--dur-ui) var(--ease-out),
    transform var(--dur-press) var(--ease-out);

  &:active {
    transform: scale(0.97);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      ${({ $selected }) => ($selected ? "" : "box-shadow: inset 0 0 0 1px var(--text-secondary); color: var(--text-primary);")}
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }
`;
