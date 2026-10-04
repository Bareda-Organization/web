import styled from "@emotion/styled";

export const StyledTabs = styled.div`
  display: flex;
  gap: var(--s1);
  border-bottom: 1px solid var(--border-default);
  margin-bottom: var(--s4);
`;

// 켜진 탭이 아래 선을 1px 덮어 목록 면과 이어지게 한다(margin-bottom -1px). 윗선은 3px 막대가 아니라 1px(Ruling 828 D1).
export const StyledTab = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: -1px;
  padding: var(--s2) 14px;
  border: 1px solid ${({ $selected }) => ($selected ? "var(--border-default)" : "transparent")};
  border-top-color: ${({ $selected }) => ($selected ? "var(--accent-primary)" : "transparent")};
  border-bottom-color: ${({ $selected }) => ($selected ? "var(--surface-card)" : "transparent")};
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: ${({ $selected }) => ($selected ? "var(--surface-card)" : "transparent")};
  color: ${({ $selected }) => ($selected ? "var(--text-brand)" : "var(--text-secondary)")};
  font: var(--fw-medium) var(--fs-md) / 1.5 var(--font-sans);
  cursor: pointer;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      ${({ $selected }) => ($selected ? "" : "color: var(--text-primary); background: var(--bg-base);")}
    }
  }
`;

export const StyledTabCount = styled.span<{ $selected: boolean }>`
  padding: 0 7px;
  border-radius: 999px;
  background: ${({ $selected }) => ($selected ? "var(--accent-primary)" : "var(--surface-fill)")};
  color: ${({ $selected }) => ($selected ? "var(--text-inverse)" : "var(--text-secondary)")};
  font: var(--fw-bold) var(--fs-xs) / 1.5 var(--font-sans);
`;
